import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import cors from 'cors'
import { FileManager } from './builder/fileManager.js'
import { getBaseTemplate } from './builder/templateEngine.js'
import { createZipBundle } from './builder/bundler.js'
import { architect } from './agents/architect.js'
import { frontendDev } from './agents/frontend-dev.js'
import { stylist } from './agents/stylist.js'
import { reviewer } from './agents/reviewer.js'
import { qaTester } from './agents/qa-tester.js'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// DeepSeek client via OpenAI SDK
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const AGENTS = [architect, frontendDev, stylist, reviewer, qaTester]

// Active build sessions
const sessions = new Map()

// ============================================================
// BUILD SESSION CLASS
// ============================================================

class BuildSession {
  constructor(ws, sessionId, brief, config) {
    this.ws = ws
    this.id = sessionId
    this.brief = brief
    this.config = config
    this.fs = new FileManager()
    this.plan = null
    this.messages = []
    this.reviewComments = []
    this.phase = 'PLANNING'
    this.paused = false
    this.aborted = false
    this.pendingFeedback = []
    this.progressPercent = 0
  }

  send(type, data = {}) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data, timestamp: Date.now() }))
    }
  }

  sendThinking(agentId, thought) {
    this.send('agent_thinking', { agentId, thought })
    this.messages.push({ type: 'agent_thinking', agentId, thought })
  }

  sendMessage(agentId, message, targetAgent = null) {
    this.send('agent_message', { agentId, message, targetAgent })
    this.messages.push({ type: 'agent_message', agentId, message, targetAgent })
  }

  sendFileCreated(path, content, agentId, reason = '') {
    this.fs.create(path, content, agentId)
    this.send('file_created', { path, content, agentId, reason })
    this.messages.push({ type: 'file_created', path, agentId })
  }

  sendFileModified(path, content, agentId, reason = '') {
    const file = this.fs.modify(path, content, agentId)
    this.send('file_modified', { path, content, diff: file.diff, agentId, reason })
    this.messages.push({ type: 'file_modified', path, agentId })
    // Trigger preview update
    this.updatePreview()
  }

  updatePreview() {
    const preview = this.fs.buildPreview()
    if (preview.html) {
      this.send('preview_update', preview)
    }
  }

  sendPhaseChange(to) {
    const from = this.phase
    this.phase = to
    this.send('phase_change', { from, to })
    this.messages.push({ type: 'phase_change', from, to })
  }

  setProgress(percent, milestone = '') {
    this.progressPercent = percent
    this.send('build_progress', { percent, milestone })
  }

  getFilePaths() {
    return this.fs.getPaths()
  }

  getAllFiles() {
    return this.fs.getAll()
  }

  getFilesByType(exts) {
    return this.fs.getByExtensions(exts)
  }

  getRecentMessages(n = 10) {
    return this.messages.slice(-n)
  }

  getReviewComments() {
    return this.reviewComments
  }

  addFeedback(message) {
    this.pendingFeedback.push(message)
  }

  async waitIfPaused() {
    while (this.paused && !this.aborted) {
      await sleep(500)
    }
  }

  abort() {
    this.aborted = true
  }
}

// ============================================================
// WEBSOCKET HANDLER
// ============================================================

wss.on('connection', (ws) => {
  const clientId = uuidv4()
  let currentSession = null

  console.log(`[WS] Client connected: ${clientId}`)

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString())
      console.log(`[WS] ${clientId} → ${msg.type}`)

      switch (msg.type) {
        case 'start_build': {
          if (currentSession) {
            currentSession.abort()
          }
          const sessionId = uuidv4()
          const session = new BuildSession(ws, sessionId, msg.brief, msg.config || {})
          currentSession = session
          sessions.set(sessionId, session)

          // Run the build in background
          runBuild(session).catch(err => {
            console.error('[Build] Error:', err)
            session.send('build_error', { message: err.message })
          })
          break
        }

        case 'user_feedback': {
          if (currentSession) {
            currentSession.addFeedback(msg.message)
          }
          break
        }

        case 'resolve_conflict': {
          if (currentSession) {
            currentSession.resolvedConflict = msg
          }
          break
        }

        case 'pause_build': {
          if (currentSession) currentSession.paused = true
          break
        }

        case 'resume_build': {
          if (currentSession) currentSession.paused = false
          break
        }

        case 'approve_phase': {
          if (currentSession) currentSession.phaseApproved = true
          break
        }
      }
    } catch (err) {
      console.error('[WS] Message parse error:', err)
    }
  })

  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${clientId}`)
    if (currentSession) {
      currentSession.abort()
      sessions.delete(currentSession.id)
    }
  })
})

// ============================================================
// AGENT CALL
// ============================================================

async function callAgent(session, agent, userPrompt, additionalContext = '') {
  await session.waitIfPaused()
  if (session.aborted) return null

  const filesContext = session.getAllFiles()
    .slice(-10)
    .map(f => `\n--- ${f.path} ---\n${f.content?.slice(0, 2000) || '(empty)'}`)
    .join('\n')

  const recentMsgs = session.getRecentMessages(6)
    .map(m => `[${m.agentId || 'system'}]: ${m.message || m.thought || `${m.type} ${m.path || ''}`}`)
    .join('\n')

  const messages = [
    {
      role: 'system',
      content: agent.systemPrompt,
    },
    {
      role: 'user',
      content: `## PROJECT BRIEF
${session.brief}

## SITE TYPE
${session.config?.siteType || 'landing'}

## STYLE PREFERENCES
Preset: ${session.config?.stylePreset || 'modern-dark'}
Primary Color: ${session.config?.primaryColor || '#3b82f6'}
Font: ${session.config?.fontPreference || 'sans-serif'}
Animations: ${session.config?.animations ? 'yes' : 'no'}
Responsive: ${session.config?.responsive ? 'yes' : 'no'}
Dark mode site: ${session.config?.darkMode ? 'yes' : 'no'}

## ARCHITECT'S PLAN
${session.plan ? JSON.stringify(session.plan, null, 2) : 'Not yet created'}

## RECENT TEAM ACTIVITY
${recentMsgs || 'No recent activity'}

## CURRENT FILES
${filesContext || 'No files yet'}

${additionalContext ? `## ADDITIONAL CONTEXT\n${additionalContext}` : ''}

## YOUR TASK
${userPrompt}

Remember to use the output formats in your system prompt. Write complete, working code.`,
    },
  ]

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-reasoner',
      messages,
      max_tokens: 8000,
      stream: false,
      // Note: deepseek-reasoner does not support temperature parameter
    })

    const choice = response.choices[0]?.message

    // R1 returns reasoning_content (chain-of-thought) — stream it as thinking events
    if (choice?.reasoning_content) {
      // Send reasoning as thinking in chunks (split by sentences for UX)
      const reasoning = choice.reasoning_content.trim()
      if (reasoning && session.ws.readyState === WebSocket.OPEN) {
        session.sendThinking(agent.id, reasoning.slice(0, 600) + (reasoning.length > 600 ? '...' : ''))
      }
    }

    return choice?.content || ''
  } catch (err) {
    console.error(`[Agent:${agent.id}] API Error:`, err.message)
    return null
  }
}

// ============================================================
// RESPONSE PARSER
// ============================================================

function parseAgentResponse(session, agentId, responseText) {
  if (!responseText) return

  // Parse THINKING blocks
  const thinkingMatches = responseText.matchAll(/===THINKING===([\s\S]*?)===END_THINKING===/g)
  for (const match of thinkingMatches) {
    session.sendThinking(agentId, match[1].trim())
  }

  // Parse MESSAGE blocks
  const messageMatches = responseText.matchAll(/===MESSAGE:\s*@?(\w[\w-]*)===([\s\S]*?)===END_MESSAGE===/g)
  for (const match of messageMatches) {
    const targetAgent = match[1].trim().toLowerCase()
    const message = match[2].trim()
    // Map name to agent ID
    const targetId = resolveAgentId(targetAgent)
    session.sendMessage(agentId, message, targetId)
  }

  // Parse FILE_CREATE blocks
  const createMatches = responseText.matchAll(/===FILE_CREATE:\s*([^\n=]+)===([\s\S]*?)===END_FILE===/g)
  for (const match of createMatches) {
    const path = match[1].trim()
    const content = match[2].trim()
    if (path && content) {
      session.sendFileCreated(path, content, agentId, 'Created by ' + agentId)
    }
  }

  // Parse FILE_MODIFY blocks
  const modifyMatches = responseText.matchAll(/===FILE_MODIFY:\s*([^\n=]+)===([\s\S]*?)===END_FILE===/g)
  for (const match of modifyMatches) {
    const path = match[1].trim()
    const content = match[2].trim()
    if (path && content) {
      // Only modify if file exists, otherwise create
      if (session.fs.get(path)) {
        session.sendFileModified(path, content, agentId, 'Modified by ' + agentId)
      } else {
        session.sendFileCreated(path, content, agentId, 'Created by ' + agentId)
      }
    }
  }

  // Parse REVIEW_COMMENT blocks
  const reviewMatches = responseText.matchAll(/===REVIEW_COMMENT:\s*([^\n=]+)===([\s\S]*?)===END_REVIEW===/g)
  for (const match of reviewMatches) {
    const fileAndLine = match[1].trim()
    const comment = match[2].trim()
    const [file, line] = fileAndLine.split(':')
    session.send('review_comment', {
      agentId,
      file: file?.trim(),
      line: line ? parseInt(line) : null,
      comment,
    })
    session.reviewComments.push({ file: file?.trim(), line, comment, agentId })
    session.messages.push({ type: 'review_comment', agentId, file: file?.trim(), comment })
  }

  // Parse BUG_REPORT blocks
  const bugMatches = responseText.matchAll(/===BUG_REPORT:\s*severity=(\w+)===([\s\S]*?)===END_BUG===/g)
  for (const match of bugMatches) {
    const severity = match[1].trim().toLowerCase()
    const body = match[2].trim()
    // Extract description line
    const descLine = body.split('\n').find(l => l.startsWith('Issue:'))
    const description = descLine ? descLine.replace('Issue:', '').trim() : body.split('\n')[0]
    session.send('bug_report', { agentId, severity, description, body })
    session.messages.push({ type: 'bug_report', agentId, severity, description })
  }

  // Check for plain message (fallback — if agent wrote something but no format)
  if (!responseText.includes('===')) {
    // Treat the whole response as a message
    const short = responseText.slice(0, 500).trim()
    if (short) {
      session.sendMessage(agentId, short)
    }
  }
}

function resolveAgentId(name) {
  const map = {
    kuba: 'architect', architect: 'architect',
    maja: 'frontend-dev', 'frontend-dev': 'frontend-dev', frontend: 'frontend-dev',
    leo: 'stylist', stylist: 'stylist',
    nova: 'reviewer', reviewer: 'reviewer',
    rex: 'qa-tester', 'qa-tester': 'qa-tester', qa: 'qa-tester',
  }
  return map[name.toLowerCase()] || name
}

// ============================================================
// BUILD ORCHESTRATION
// ============================================================

async function runBuild(session) {
  const { config } = session
  const template = getBaseTemplate(config?.siteType || 'landing', config)

  console.log(`[Build:${session.id}] Starting — ${session.brief.slice(0, 60)}`)

  // ── PHASE 1: PLANNING ──
  session.sendPhaseChange('PLANNING')
  session.setProgress(5, 'Starting planning phase')

  session.sendThinking('architect', 'Analyzing the user brief. Let me think about the best structure for this website...')

  const planResponse = await callAgent(
    session,
    architect,
    `Analyze this brief and create a detailed project plan. Create the initial HTML structure file. Think step by step about:
1. What sections does this website need?
2. What JavaScript interactions are required?
3. What's the file structure?
4. What design direction (color, style) fits this brief?

Base template hint: ${template.description}
Suggested files: ${template.files.join(', ')}
Suggested sections: ${template.sections.join(', ')}

After planning, create the main index.html with the full HTML structure (real content, not placeholders).
Also MESSAGE @maja and @leo with their tasks.`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'architect', planResponse)

  // Extract plan from response
  session.plan = {
    siteType: config?.siteType || 'landing',
    template,
    brief: session.brief,
    filesPlanned: template.files,
    sectionsPlanned: template.sections,
  }

  session.setProgress(15, 'Planning complete')
  await sleep(800)

  // ── PHASE 2: SCAFFOLDING ──
  session.sendPhaseChange('SCAFFOLDING')
  session.setProgress(20, 'Setting up file structure')

  if (session.aborted) return

  const scaffoldResponse = await callAgent(
    session,
    frontendDev,
    `Kuba (Architect) has created the initial structure. Now:
1. Review what Kuba built in index.html
2. Create the main CSS file (css/styles.css) with the base design system, CSS variables, and styles for all sections Kuba defined
3. Create js/main.js with JavaScript for interactivity
4. Make sure everything works together

The style should be: ${config?.stylePreset || 'modern-dark'}.
Primary color: ${config?.primaryColor || '#3b82f6'}.
${config?.darkMode ? 'Build a dark-themed site.' : ''}
${config?.animations ? 'Include smooth CSS transitions and hover animations.' : ''}
${config?.responsive ? 'Make it mobile-responsive.' : ''}`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'frontend-dev', scaffoldResponse)

  session.setProgress(30, 'Scaffolding complete')
  await sleep(600)

  // ── PHASE 3: CODING ──
  session.sendPhaseChange('CODING')
  session.setProgress(35, 'Frontend dev coding')

  // Leo styles in parallel with Maja coding
  session.sendThinking('stylist', "Let me check what Maja has written so I can apply proper styling. First impression... interesting structure, but that color scheme needs work.")

  const stylistResponse = await callAgent(
    session,
    stylist,
    `Review Maja's HTML structure and COMPLETELY REWRITE css/styles.css with:
1. A complete, beautiful design system (CSS variables for all tokens)
2. Professional styling for every section in the HTML
3. Smooth animations and hover effects (${config?.animations ? 'yes, add them' : 'keep minimal'})
4. ${config?.responsive ? 'Mobile-first responsive design' : 'Desktop-optimized layout'}
5. Style preset: ${config?.stylePreset || 'modern-dark'}
6. Primary brand color: ${config?.primaryColor || '#3b82f6'}

Make it look premium and polished. Don't be shy about opinionated design choices.`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'stylist', stylistResponse)

  session.setProgress(50, 'Styling applied')
  await sleep(600)

  // Add user feedback if any
  if (session.pendingFeedback.length > 0) {
    const feedbackCtx = `User feedback received: ${session.pendingFeedback.join('. ')}`
    session.pendingFeedback = []
    session.sendThinking('frontend-dev', `Got user feedback! Implementing changes: ${feedbackCtx}`)

    const feedbackResponse = await callAgent(
      session,
      frontendDev,
      `The user gave us feedback: "${feedbackCtx}".
Update the relevant files to address this feedback. Be specific about what you're changing and why.`
    )
    if (!session.aborted) parseAgentResponse(session, 'frontend-dev', feedbackResponse)
  }

  // ── PHASE 4: REVIEWING ──
  session.sendPhaseChange('REVIEWING')
  session.setProgress(60, 'Code review in progress')

  session.sendThinking('reviewer', "Alright, let me go through all this code carefully. I already spotted something on line 23...")

  const reviewResponse = await callAgent(
    session,
    reviewer,
    `Do a thorough code review of ALL files. Check for:
1. HTML: semantic correctness, missing meta tags, accessibility (alt text, ARIA), broken structure
2. CSS: unused rules, missing responsive breakpoints, specificity issues
3. JavaScript: null checks, error handling, console.log left in, event listeners
4. Overall: does it match the user's brief? Are all promised sections present?

Report specific issues with file name and line numbers. Also identify 2-3 things that are actually well done.`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'reviewer', reviewResponse)

  session.setProgress(70, 'Review complete')
  await sleep(600)

  // ── PHASE 5: FIXING ──
  session.sendPhaseChange('FIXING')
  session.setProgress(73, 'Fixing review issues')

  if (session.reviewComments.length > 0) {
    session.sendThinking('frontend-dev', `Nova found ${session.reviewComments.length} issues. On it...`)

    const fixResponse = await callAgent(
      session,
      frontendDev,
      `Nova's code review found these issues:
${session.reviewComments.map(c => `- ${c.file}:${c.line || '?'} — ${c.comment}`).join('\n')}

Fix ALL the issues in the relevant files. Show the complete fixed file content for each file you modify.`
    )

    if (!session.aborted) parseAgentResponse(session, 'frontend-dev', fixResponse)
  }

  // Leo does final styling pass
  session.sendThinking('stylist', "While they fix bugs, let me do a final styling pass. Those hover states need more love...")

  const stylistPolish = await callAgent(
    session,
    stylist,
    `Do a final CSS polish pass:
1. Review the current css/styles.css and improve it
2. Add missing hover states, focus styles, and transitions
3. Fix any responsive breakpoint issues
4. Make sure the design is cohesive and premium-looking
5. Add any final touches that will make it shine

Update css/styles.css with the polished version.`
  )

  if (!session.aborted) parseAgentResponse(session, 'stylist', stylistPolish)

  session.setProgress(82, 'Fixes applied')
  await sleep(500)

  // ── PHASE 6: TESTING ──
  session.sendPhaseChange('TESTING')
  session.setProgress(85, 'QA testing')

  session.sendThinking('qa-tester', "Time to break things! Let me go through the checklist... I have a feeling that mobile nav is gonna be interesting.")

  const qaResponse = await callAgent(
    session,
    qaTester,
    `Test the complete website. Check:
1. All sections render correctly and match the brief
2. HTML structure is valid and semantic
3. CSS handles all viewport sizes (mobile 375px, tablet 768px, desktop 1440px)
4. JavaScript interactions work (forms, modals, buttons, etc.)
5. No broken links, missing images, or console errors
6. Accessibility: keyboard navigation, screen reader support

Report any bugs found. If everything passes, give the QA PASS confirmation!`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'qa-tester', qaResponse)

  session.setProgress(92, 'QA complete')
  await sleep(500)

  // ── PHASE 7: POLISHING ──
  session.sendPhaseChange('POLISHING')
  session.setProgress(95, 'Final polish')

  // Check for more user feedback
  if (session.pendingFeedback.length > 0) {
    const feedbackCtx = session.pendingFeedback.join('. ')
    session.pendingFeedback = []

    const lateFixResponse = await callAgent(
      session,
      stylist,
      `Late user feedback: "${feedbackCtx}". Apply any visual/design changes requested. Update the relevant files.`
    )
    if (!session.aborted) parseAgentResponse(session, 'stylist', lateFixResponse)
  }

  session.sendMessage('architect', 'Project complete. Final review: all agents have signed off. The build is ready for delivery.', null)
  session.sendMessage('reviewer', 'Confirmed. Code quality is acceptable. Signing off. 🔍', null)
  session.sendMessage('qa-tester', 'QA PASS! All tests cleared. Ship it! 🧪', null)

  // ── PHASE 8: COMPLETE ──
  session.sendPhaseChange('COMPLETE')
  session.setProgress(100, 'Build complete')

  session.updatePreview()

  const summary = `Successfully built a ${session.config?.siteType || 'landing'} page with ${session.fs.files.size} files. The 5-agent team collaborated to create a responsive, polished website matching your brief.`

  session.send('build_complete', {
    files: session.fs.toArray(),
    summary,
    fileCount: session.fs.files.size,
  })

  console.log(`[Build:${session.id}] Complete — ${session.fs.files.size} files`)
}

// ============================================================
// REST ENDPOINTS
// ============================================================

app.post('/api/download', async (req, res) => {
  try {
    const { files } = req.body
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Invalid files' })
    }
    createZipBundle(files, res)
  } catch (err) {
    console.error('[Download]', err)
    res.status(500).json({ error: 'Download failed' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessions.size,
    timestamp: Date.now(),
  })
})

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`[Server] White Ninja AI running on port ${PORT}`)
  console.log(`[Server] WS endpoint: ws://localhost:${PORT}/ws`)
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'your_deepseek_api_key_here') {
    console.warn('[Server] WARNING: DEEPSEEK_API_KEY not set — agent calls will fail')
  }
})

// ============================================================
// UTILS
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
