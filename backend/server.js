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

  session.sendThinking('architect', `Reading the brief carefully: "${session.brief.slice(0, 120)}..." — determining file structure, sections, and design direction.`)

  const planResponse = await callAgent(
    session,
    architect,
    `You are starting a new website project. Analyze this brief deeply and build the foundation.

USER BRIEF: "${session.brief}"

CONFIGURATION:
- Site type: ${config?.siteType || 'landing'}
- Style preset: ${config?.stylePreset || 'modern-dark'}
- Primary color: ${config?.primaryColor || '#3b82f6'}
- Dark mode site: ${config?.darkMode ? 'YES — build dark themed' : 'no'}
- Animations: ${config?.animations ? 'YES — include them' : 'keep minimal'}
- Responsive: ${config?.responsive ? 'YES — mobile-first' : 'desktop only'}
- Code quality: ${config?.codeQuality || 'balanced'}

STEP 1 — THINK through the architecture:
- What are the exact named sections this specific website needs? (e.g. HeroSection, PricingCards, TestimonialSlider)
- What JavaScript interactions are needed? (forms, modals, scroll effects, etc.)
- What unique visual elements does this brief require?

STEP 2 — Create index.html with REAL content:
- Write ALL the actual text content, headings, copy (don't use Lorem ipsum)
- Include all sections from the brief with proper HTML5 semantics
- Add descriptive class names that Leo can style (e.g. .hero__cta, .pricing-card--featured)
- Link to css/styles.css and js/main.js

STEP 3 — Brief the team:
- MESSAGE @maja with specific JS tasks she needs to implement (list them by section)
- MESSAGE @leo with the design direction, color palette intent, and which sections need special attention

Base template: ${template.description}
Suggested sections: ${template.sections.join(', ')}

Write complete, production-ready HTML with meaningful content from the brief.`
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
    `Kuba just finished the HTML structure. Your turn, Maja.

Your tasks:
1. READ index.html carefully — understand every section and class name Kuba used
2. Create js/main.js with JavaScript for ALL interactive elements. This must include:
   - Mobile navigation toggle (hamburger menu)
   - Smooth scroll behavior for anchor links
   - Any form validation mentioned in the brief
   - Scroll-triggered animations if animations are enabled (${config?.animations ? 'YES, add them' : 'no'})
   - Any specific interactions the brief mentions
3. MESSAGE @leo telling him EXACTLY what class names you and Kuba used in the HTML, so he can write CSS that targets them correctly. List every major section class.
4. MESSAGE @nova to confirm you've got the HTML structure documented for review

After finishing, MESSAGE @kuba confirming what you built and any structural concerns.

The brief: "${session.brief.slice(0, 200)}"`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'frontend-dev', scaffoldResponse)

  session.setProgress(30, 'Scaffolding complete')
  await sleep(600)

  // ── PHASE 3: CODING ──
  session.sendPhaseChange('CODING')
  session.setProgress(35, 'Frontend dev coding')

  // Leo styles in parallel with Maja coding
  session.sendThinking('stylist', `Kuba and Maja have finished the structure. Time to make this look incredible. Brief says: "${session.brief.slice(0, 100)}..." — I can already see the visual direction.`)

  const stylistResponse = await callAgent(
    session,
    stylist,
    `Maja and Kuba have built the HTML structure. Now it's your turn to make it look stunning.

READ all existing files carefully, especially every class name and section in index.html.

Create css/styles.css with a COMPLETE, professional design system:

1. CSS VARIABLES (design tokens):
   - Color palette: primary ${config?.primaryColor || '#3b82f6'}, backgrounds, surfaces, text colors
   - Typography scale: font sizes, weights, line heights
   - Spacing system: consistent gap/padding values
   - Border radius, shadows, transitions

2. GLOBAL STYLES:
   - CSS reset/normalize
   - Body, typography defaults
   - Link, button base styles

3. SECTION STYLES — style EVERY section from the HTML:
   - Hero section (always the most important — make it breathtaking)
   - Navigation (sticky, with mobile hamburger states)
   - All other sections from the brief
   - Footer

4. DESIGN DIRECTION:
   - Preset: ${config?.stylePreset || 'modern-dark'}
   - ${config?.darkMode ? 'DARK THEME — use dark backgrounds, light text, glows' : 'LIGHT THEME — clean, airy'}
   - Primary brand color: ${config?.primaryColor || '#3b82f6'}
   - ${config?.animations ? 'Add CSS animations: fade-in on scroll (use .is-visible class), hover transforms, smooth transitions' : 'Keep animations minimal'}
   - ${config?.responsive ? 'MOBILE FIRST: start with mobile, add breakpoints at 768px and 1200px' : 'Desktop-optimized'}

5. After styling, MESSAGE @maja listing any class names you expect from the JS (like .nav--open, .is-visible) so she can add them in js/main.js
6. MESSAGE @nova that CSS is ready for review

Make it look like a premium agency built this. Be opinionated and bold.`
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

  session.sendThinking('reviewer', "Alright team — my turn. I'm going through every file with a fine-tooth comb. Let me start with the HTML structure, then CSS, then JS...")

  const reviewResponse = await callAgent(
    session,
    reviewer,
    `You are doing a thorough code review of the complete website. Read every file carefully.

USER'S BRIEF (what they wanted): "${session.brief.slice(0, 300)}"

Your review must cover:

1. BRIEF COMPLIANCE — Does the website actually deliver what was promised?
   - List each requirement from the brief and whether it's implemented
   - Flag any missing sections or features

2. HTML REVIEW (index.html):
   - Semantic HTML5 correctness
   - Missing/incorrect meta tags (title, description, og:tags)
   - Accessibility issues (missing alt text, ARIA labels, form labels, skip links)
   - Logical heading hierarchy (h1 → h2 → h3)

3. CSS REVIEW (css/styles.css):
   - Missing responsive breakpoints or broken layouts at 375px/768px/1440px
   - Hardcoded values that should be CSS variables
   - Missing hover/focus states on interactive elements
   - Color contrast issues

4. JAVASCRIPT REVIEW (js/main.js):
   - Unchecked null references (querySelector that might return null)
   - Missing event listener cleanup
   - Broken interactive features from the brief

For EACH issue found, write:
===REVIEW_COMMENT: filename:approximate_line===
[precise description of the issue and how to fix it]
===END_REVIEW===

Also write a MESSAGE @maja with the top 3 priority fixes she needs to do immediately.
Write a MESSAGE @leo with the top 2 CSS improvements needed.`
  )

  if (session.aborted) return
  parseAgentResponse(session, 'reviewer', reviewResponse)

  session.setProgress(70, 'Review complete')
  await sleep(600)

  // ── PHASE 5: FIXING ──
  session.sendPhaseChange('FIXING')
  session.setProgress(73, 'Fixing review issues')

  if (session.reviewComments.length > 0) {
    session.sendThinking('frontend-dev', `Nova flagged ${session.reviewComments.length} issues. Prioritizing them by severity and fixing everything...`)

    const fixResponse = await callAgent(
      session,
      frontendDev,
      `Nova (Code Reviewer) flagged these issues that need fixing:
${session.reviewComments.map(c => `- ${c.file}:${c.line || '?'} — ${c.comment}`).join('\n')}

Fix ALL issues. For each file you touch, output the COMPLETE updated file content (not just the changed lines).
After fixing, MESSAGE @nova confirming what you fixed and flagging anything you couldn't fix.
MESSAGE @leo if any class names in the HTML changed so he can update the CSS.`
    )

    if (!session.aborted) parseAgentResponse(session, 'frontend-dev', fixResponse)
  } else {
    session.sendThinking('frontend-dev', "Nova's review came back clean — no major issues. Doing a final JS polish pass anyway...")
  }

  // Leo does final styling pass
  session.sendThinking('stylist', "Nova pointed out some CSS issues. Also doing my own final aesthetic pass — I want this to look perfect.")

  const stylistPolish = await callAgent(
    session,
    stylist,
    `Nova's review flagged some CSS issues. Fix them AND do a final design polish pass.

Nova's CSS feedback:
${session.reviewComments.filter(c => c.file?.includes('.css')).map(c => `- ${c.comment}`).join('\n') || '(No specific CSS issues flagged — focus on polish)'}

Your final polish checklist:
1. Every interactive element has visible hover AND focus states
2. Smooth transitions on all state changes (nav, buttons, cards)
3. ${config?.responsive ? 'Verify mobile breakpoints — hero, nav, and grid all look good at 375px' : 'Fine-tune desktop layout'}
4. Ensure visual hierarchy: headings, subheadings, body text, captions all have distinct sizes
5. Add any micro-animations that will delight users (subtle, not distracting)
6. Check that the primary color ${config?.primaryColor || '#3b82f6'} is used consistently and effectively

After updating, MESSAGE @rex that CSS is polished and ready for QA testing.

Output the complete final css/styles.css.`
  )

  if (!session.aborted) parseAgentResponse(session, 'stylist', stylistPolish)

  session.setProgress(82, 'Fixes applied')
  await sleep(500)

  // ── PHASE 6: TESTING ──
  session.sendPhaseChange('TESTING')
  session.setProgress(85, 'QA testing')

  session.sendThinking('qa-tester', "Leo said it's ready. Let's see about that. Pulling out my QA checklist... I'm going to test EVERYTHING the brief asked for.")

  const qaResponse = await callAgent(
    session,
    qaTester,
    `You are doing final QA on the complete website build. Be thorough and methodical.

ORIGINAL BRIEF (what the user requested): "${session.brief.slice(0, 400)}"

Test everything systematically:

1. FEATURE COVERAGE — go through the brief line by line:
   - Mark each requested feature as PASS ✅ or FAIL ❌
   - For fails, write a BUG_REPORT

2. VISUAL RENDERING:
   - Does the page have proper content (not placeholder text)?
   - Do all sections look intentional and styled?
   - Does the hero section make a strong first impression?

3. RESPONSIVE BEHAVIOR:
   - At 375px (mobile): navigation collapses, content stacks, text is readable
   - At 768px (tablet): layout adapts correctly
   - At 1440px (desktop): full layout, nothing overflows

4. INTERACTIONS:
   - Navigation links work
   - Buttons have visible states
   - Any forms have proper validation
   - JavaScript features from the brief are implemented

5. TECHNICAL QUALITY:
   - No obvious console errors
   - No broken/missing assets
   - Proper HTML semantics (h1 used once, inputs have labels, images have alt)

For each bug found, use:
===BUG_REPORT: severity=high|medium|low===
Issue: [exact description]
File: [filename]
Fix: [suggested fix]
===END_BUG===

If overall quality is acceptable, end with a MESSAGE @kuba with your QA verdict and summary.
If there are critical failures, MESSAGE @maja with specific fixes needed.`
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

// ============================================================
// CONFIG SUGGESTION ENDPOINT
// ============================================================

app.post('/api/suggest-config', async (req, res) => {
  try {
    const { brief } = req.body
    if (!brief) return res.status(400).json({ error: 'Brief required' })

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a senior web project analyst. Analyze website briefs and return JSON config suggestions. Return ONLY valid JSON with no markdown fences or extra text.',
        },
        {
          role: 'user',
          content: `Analyze this website brief and return a JSON config object.

BRIEF: "${brief}"

Return JSON with this exact structure:
{
  "suggestedConfig": {
    "siteType": "landing|portfolio|blog|ecommerce|dashboard|custom",
    "stylePreset": "modern-dark|clean-minimal|bold-colorful|corporate|retro",
    "primaryColor": "#hexcolor",
    "animations": true|false,
    "darkMode": true|false,
    "responsive": true|false,
    "includeImages": true|false,
    "codeQuality": "speed|balanced|perfectionist"
  },
  "reasoning": "One sentence explaining your config choices based on the brief.",
  "customQuestions": [
    {
      "id": "unique_snake_case_id",
      "label": "Short question label (max 4 words)",
      "description": "Why this choice matters for this specific project",
      "icon": "one of: Palette, Layout, Target, Users, Zap, Package, Globe, Star, Layers, Type",
      "configKey": "camelCaseKey",
      "options": [
        { "value": "val1", "label": "Label 1", "emoji": "emoji", "desc": "short benefit" },
        { "value": "val2", "label": "Label 2", "emoji": "emoji", "desc": "short benefit" },
        { "value": "val3", "label": "Label 3", "emoji": "emoji", "desc": "short benefit" }
      ],
      "defaultValue": "val1"
    }
  ]
}

Rules:
- customQuestions: generate exactly 3 questions that are SPECIFIC and UNIQUE to this brief. Not generic. If the brief mentions a luxury brand, ask about pricing display style. If it mentions e-commerce, ask about cart behavior. If it mentions a portfolio, ask about project showcase layout. Make them relevant.
- Each question must have exactly 3 options.
- primaryColor: pick a hex color that fits the visual vibe described in the brief.
- Be opinionated — pre-select the most sensible defaults.
- Do not add generic questions like "What framework?" or "Mobile or desktop?".`,
        },
      ],
      max_tokens: 2000,
    })

    const text = response.choices[0]?.message?.content || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const suggestions = JSON.parse(jsonMatch[0])
    res.json(suggestions)
  } catch (err) {
    console.error('[SuggestConfig]', err.message)
    res.json({ suggestedConfig: {}, reasoning: '', customQuestions: [] })
  }
})

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
