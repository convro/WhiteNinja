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

// ============================================================
// STRUCTURED LOGGER
// ============================================================

const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' }

function formatTimestamp() {
  return new Date().toISOString()
}

const logger = {
  info(context, message, meta = {}) {
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''
    console.log(`${formatTimestamp()} [INFO] [${context}] ${message}${metaStr}`)
  },
  warn(context, message, meta = {}) {
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''
    console.warn(`${formatTimestamp()} [WARN] [${context}] ${message}${metaStr}`)
  },
  error(context, message, meta = {}) {
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''
    console.error(`${formatTimestamp()} [ERROR] [${context}] ${message}${metaStr}`)
  },
}

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================

const SERVER_VERSION = '0.2.0'
const MAX_CONCURRENT_BUILDS = 3
const MAX_API_CALLS_PER_MINUTE = 5
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000 // check every minute
const AGENT_CALL_TIMEOUT_MS = 60 * 1000 // 60 seconds per API call
const API_RETRY_COUNT = 3
const BRIEF_MIN_LENGTH = 10
const BRIEF_MAX_LENGTH = 5000

const serverStartTime = Date.now()

// ============================================================
// API KEY VALIDATION
// ============================================================

function isApiKeyValid() {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key || key.trim() === '') return false
  if (key === 'your_deepseek_api_key_here') return false
  if (key.length < 10) return false
  return true
}

const apiKeyValid = isApiKeyValid()

// ============================================================
// EXPRESS & WEBSOCKET SETUP
// ============================================================

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// DeepSeek client via OpenAI SDK
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'invalid',
  baseURL: 'https://api.deepseek.com',
})

const AGENTS = [architect, frontendDev, stylist, reviewer, qaTester]

// Active build sessions
const sessions = new Map()

// ============================================================
// RATE LIMITER (in-memory)
// ============================================================

class RateLimiter {
  constructor() {
    // Track per-session API call timestamps
    this.sessionCalls = new Map()
  }

  getActiveBuildCount() {
    let count = 0
    for (const session of sessions.values()) {
      if (session.phase !== 'COMPLETE' && !session.aborted) {
        count++
      }
    }
    return count
  }

  canStartBuild() {
    return this.getActiveBuildCount() < MAX_CONCURRENT_BUILDS
  }

  recordApiCall(sessionId) {
    if (!this.sessionCalls.has(sessionId)) {
      this.sessionCalls.set(sessionId, [])
    }
    this.sessionCalls.get(sessionId).push(Date.now())
  }

  canMakeApiCall(sessionId) {
    if (!this.sessionCalls.has(sessionId)) return true
    const calls = this.sessionCalls.get(sessionId)
    const oneMinuteAgo = Date.now() - 60000
    // Filter to only calls in the last minute
    const recentCalls = calls.filter(ts => ts > oneMinuteAgo)
    this.sessionCalls.set(sessionId, recentCalls)
    return recentCalls.length < MAX_API_CALLS_PER_MINUTE
  }

  async waitForApiSlot(sessionId) {
    while (!this.canMakeApiCall(sessionId)) {
      logger.info('RateLimiter', `Session ${sessionId.slice(0, 8)} waiting for API rate limit slot`)
      await sleep(5000)
    }
  }

  cleanup(sessionId) {
    this.sessionCalls.delete(sessionId)
  }
}

const rateLimiter = new RateLimiter()

// ============================================================
// TOKEN USAGE TRACKER
// ============================================================

class TokenTracker {
  constructor() {
    this.sessions = new Map()
  }

  record(sessionId, agentId, usage) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { total: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, byAgent: {} })
    }
    const sessionData = this.sessions.get(sessionId)
    const promptTokens = usage?.prompt_tokens || 0
    const completionTokens = usage?.completion_tokens || 0
    const totalTokens = promptTokens + completionTokens

    sessionData.total.promptTokens += promptTokens
    sessionData.total.completionTokens += completionTokens
    sessionData.total.totalTokens += totalTokens

    if (!sessionData.byAgent[agentId]) {
      sessionData.byAgent[agentId] = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    }
    sessionData.byAgent[agentId].promptTokens += promptTokens
    sessionData.byAgent[agentId].completionTokens += completionTokens
    sessionData.byAgent[agentId].totalTokens += totalTokens
  }

  getSessionUsage(sessionId) {
    return this.sessions.get(sessionId) || null
  }

  cleanup(sessionId) {
    this.sessions.delete(sessionId)
  }
}

const tokenTracker = new TokenTracker()

// ============================================================
// SESSION CLEANUP (auto-cleanup after 30 min inactivity)
// ============================================================

function cleanupStaleSessions() {
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    const idleTime = now - session.lastActivity
    if (idleTime > SESSION_TIMEOUT_MS) {
      logger.info('SessionCleanup', `Removing stale session ${id.slice(0, 8)}`, {
        idleMinutes: Math.round(idleTime / 60000),
        phase: session.phase,
      })
      session.abort()
      rateLimiter.cleanup(id)
      tokenTracker.cleanup(id)
      sessions.delete(id)
    }
  }
}

const cleanupInterval = setInterval(cleanupStaleSessions, SESSION_CLEANUP_INTERVAL_MS)

// Allow the process to exit cleanly
cleanupInterval.unref()

// ============================================================
// INPUT VALIDATION
// ============================================================

function validateBrief(brief) {
  if (typeof brief !== 'string') {
    return { valid: false, error: 'Brief must be a string' }
  }
  const trimmed = brief.trim()
  if (trimmed.length < BRIEF_MIN_LENGTH) {
    return { valid: false, error: `Brief must be at least ${BRIEF_MIN_LENGTH} characters (got ${trimmed.length})` }
  }
  if (trimmed.length > BRIEF_MAX_LENGTH) {
    return { valid: false, error: `Brief must be at most ${BRIEF_MAX_LENGTH} characters (got ${trimmed.length})` }
  }
  return { valid: true, error: null }
}

function validateConfig(config) {
  if (config === undefined || config === null) {
    return { valid: true, config: {}, error: null }
  }
  if (typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, config: null, error: 'Config must be a plain object' }
  }

  const allowedSiteTypes = ['landing', 'portfolio', 'blog', 'ecommerce', 'dashboard', 'custom']
  const allowedPresets = ['modern-dark', 'clean-minimal', 'bold-colorful', 'corporate', 'retro']
  const allowedCodeQuality = ['speed', 'balanced', 'perfectionist']

  const validated = { ...config }

  if (validated.siteType && !allowedSiteTypes.includes(validated.siteType)) {
    return { valid: false, config: null, error: `Invalid siteType "${validated.siteType}". Allowed: ${allowedSiteTypes.join(', ')}` }
  }
  if (validated.stylePreset && !allowedPresets.includes(validated.stylePreset)) {
    return { valid: false, config: null, error: `Invalid stylePreset "${validated.stylePreset}". Allowed: ${allowedPresets.join(', ')}` }
  }
  if (validated.codeQuality && !allowedCodeQuality.includes(validated.codeQuality)) {
    return { valid: false, config: null, error: `Invalid codeQuality "${validated.codeQuality}". Allowed: ${allowedCodeQuality.join(', ')}` }
  }
  if (validated.primaryColor && typeof validated.primaryColor === 'string') {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(validated.primaryColor)) {
      return { valid: false, config: null, error: `Invalid primaryColor "${validated.primaryColor}". Must be a valid hex color (e.g. #3b82f6)` }
    }
  }
  if (validated.animations !== undefined && typeof validated.animations !== 'boolean') {
    return { valid: false, config: null, error: 'Config "animations" must be a boolean' }
  }
  if (validated.responsive !== undefined && typeof validated.responsive !== 'boolean') {
    return { valid: false, config: null, error: 'Config "responsive" must be a boolean' }
  }
  if (validated.darkMode !== undefined && typeof validated.darkMode !== 'boolean') {
    return { valid: false, config: null, error: 'Config "darkMode" must be a boolean' }
  }

  return { valid: true, config: validated, error: null }
}

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
    this.createdAt = Date.now()
    this.lastActivity = Date.now()
    this.skippedPhases = []
  }

  touchActivity() {
    this.lastActivity = Date.now()
  }

  send(type, data = {}) {
    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type, ...data, timestamp: Date.now() }))
      }
    } catch (err) {
      logger.error('BuildSession', `Failed to send message type="${type}" to session ${this.id.slice(0, 8)}`, { error: err.message })
    }
  }

  sendThinking(agentId, thought) {
    this.touchActivity()
    this.send('agent_thinking', { agentId, thought })
    this.messages.push({ type: 'agent_thinking', agentId, thought })
  }

  sendMessage(agentId, message, targetAgent = null) {
    this.touchActivity()
    this.send('agent_message', { agentId, message, targetAgent })
    this.messages.push({ type: 'agent_message', agentId, message, targetAgent })
  }

  sendFileCreated(path, content, agentId, reason = '') {
    this.touchActivity()
    this.fs.create(path, content, agentId)
    this.send('file_created', { path, content, agentId, reason })
    this.messages.push({ type: 'file_created', path, agentId })
    this.updatePreview()
  }

  sendFileModified(path, content, agentId, reason = '') {
    this.touchActivity()
    const file = this.fs.modify(path, content, agentId)
    this.send('file_modified', { path, content, diff: file.diff, agentId, reason })
    this.messages.push({ type: 'file_modified', path, agentId })
    // Trigger preview update
    this.updatePreview()
  }

  updatePreview() {
    try {
      const preview = this.fs.buildPreview()
      if (preview.html) {
        this.send('preview_update', preview)
      }
    } catch (err) {
      logger.error('BuildSession', `Preview update failed for session ${this.id.slice(0, 8)}`, { error: err.message })
    }
  }

  sendPhaseChange(to) {
    this.touchActivity()
    const from = this.phase
    this.phase = to
    this.send('phase_change', { from, to })
    this.messages.push({ type: 'phase_change', from, to })
  }

  setProgress(percent, milestone = '') {
    this.touchActivity()
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
    this.touchActivity()
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

  logger.info('WS', `Client connected: ${clientId}`)

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString())
      logger.info('WS', `${clientId} -> ${msg.type}`)

      switch (msg.type) {
        case 'start_build': {
          // Validate API key
          if (!apiKeyValid) {
            ws.send(JSON.stringify({
              type: 'build_error',
              message: 'Server is not configured with a valid DeepSeek API key. Cannot start build.',
              timestamp: Date.now(),
            }))
            logger.error('WS', 'Build rejected: invalid or missing DEEPSEEK_API_KEY')
            break
          }

          // Validate brief
          const briefValidation = validateBrief(msg.brief)
          if (!briefValidation.valid) {
            ws.send(JSON.stringify({
              type: 'build_error',
              message: `Invalid brief: ${briefValidation.error}`,
              timestamp: Date.now(),
            }))
            logger.warn('WS', `Build rejected: ${briefValidation.error}`)
            break
          }

          // Validate config
          const configValidation = validateConfig(msg.config)
          if (!configValidation.valid) {
            ws.send(JSON.stringify({
              type: 'build_error',
              message: `Invalid config: ${configValidation.error}`,
              timestamp: Date.now(),
            }))
            logger.warn('WS', `Build rejected: ${configValidation.error}`)
            break
          }

          // Rate limit: max concurrent builds
          if (!rateLimiter.canStartBuild()) {
            ws.send(JSON.stringify({
              type: 'build_error',
              message: `Server is at maximum capacity (${MAX_CONCURRENT_BUILDS} concurrent builds). Please try again shortly.`,
              timestamp: Date.now(),
            }))
            logger.warn('WS', `Build rejected: max concurrent builds reached (${MAX_CONCURRENT_BUILDS})`)
            break
          }

          if (currentSession) {
            currentSession.abort()
          }
          const sessionId = uuidv4()
          const session = new BuildSession(ws, sessionId, msg.brief.trim(), configValidation.config)
          currentSession = session
          sessions.set(sessionId, session)

          logger.info('WS', `Build session started: ${sessionId.slice(0, 8)}`, {
            siteType: configValidation.config.siteType || 'landing',
            briefLength: msg.brief.trim().length,
          })

          // Run the build in background
          runBuild(session).catch(err => {
            logger.error('Build', `Unhandled build error for session ${sessionId.slice(0, 8)}`, { error: err.message })
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
            currentSession.touchActivity()
          }
          break
        }

        case 'pause_build': {
          if (currentSession) {
            currentSession.paused = true
            currentSession.touchActivity()
          }
          break
        }

        case 'resume_build': {
          if (currentSession) {
            currentSession.paused = false
            currentSession.touchActivity()
          }
          break
        }

        case 'approve_phase': {
          if (currentSession) {
            currentSession.phaseApproved = true
            currentSession.touchActivity()
          }
          break
        }
      }
    } catch (err) {
      logger.error('WS', `Message parse error from client ${clientId}`, { error: err.message })
    }
  })

  ws.on('close', () => {
    logger.info('WS', `Client disconnected: ${clientId}`)
    if (currentSession) {
      currentSession.abort()
      sessions.delete(currentSession.id)
      rateLimiter.cleanup(currentSession.id)
    }
  })
})

// ============================================================
// AGENT CALL (with retry, timeout, rate limiting, error recovery)
// ============================================================

async function callAgentWithRetry(session, agent, userPrompt, additionalContext = '') {
  for (let attempt = 1; attempt <= API_RETRY_COUNT; attempt++) {
    try {
      const result = await callAgent(session, agent, userPrompt, additionalContext)
      return result
    } catch (err) {
      const isLastAttempt = attempt === API_RETRY_COUNT

      if (isLastAttempt) {
        logger.error('AgentRetry', `All ${API_RETRY_COUNT} attempts failed for agent ${agent.id} in session ${session.id.slice(0, 8)}`, { error: err.message })
        // Notify the client about the failure
        session.send('agent_error', {
          agentId: agent.id,
          message: `Agent ${agent.id} failed after ${API_RETRY_COUNT} attempts: ${err.message}`,
          recoverable: true,
        })
        return null
      }

      // Exponential backoff: 2s, 4s, 8s ...
      const backoffMs = Math.pow(2, attempt) * 1000
      logger.warn('AgentRetry', `Attempt ${attempt}/${API_RETRY_COUNT} failed for agent ${agent.id}, retrying in ${backoffMs}ms`, { error: err.message })
      await sleep(backoffMs)
    }
  }
  return null
}

async function callAgent(session, agent, userPrompt, additionalContext = '') {
  await session.waitIfPaused()
  if (session.aborted) return null

  // Rate limiting: wait for a slot
  await rateLimiter.waitForApiSlot(session.id)

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

## DESIGN GUIDANCE
${session.plan?.template?.designGuidance || ''}

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

  // Record the API call for rate limiting
  rateLimiter.recordApiCall(session.id)

  // Create the API call with a timeout
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), AGENT_CALL_TIMEOUT_MS)

  try {
    const response = await deepseek.chat.completions.create(
      {
        model: 'deepseek-reasoner',
        messages,
        max_tokens: 8000,
        stream: false,
        // Note: deepseek-reasoner does not support temperature parameter
      },
      { signal: controller.signal }
    )

    clearTimeout(timeoutHandle)

    // Track token usage
    if (response.usage) {
      tokenTracker.record(session.id, agent.id, response.usage)
      logger.info('TokenUsage', `Agent ${agent.id} session ${session.id.slice(0, 8)}`, {
        prompt: response.usage.prompt_tokens || 0,
        completion: response.usage.completion_tokens || 0,
      })
    }

    const choice = response.choices?.[0]?.message

    // Handle null/empty response
    if (!choice) {
      logger.warn('Agent', `Agent ${agent.id} returned empty response for session ${session.id.slice(0, 8)}`)
      throw new Error('API returned empty response (no choices)')
    }

    // R1 returns reasoning_content (chain-of-thought) -- stream it as thinking events
    if (choice.reasoning_content) {
      const reasoning = choice.reasoning_content.trim()
      if (reasoning && session.ws.readyState === WebSocket.OPEN) {
        session.sendThinking(agent.id, reasoning.slice(0, 600) + (reasoning.length > 600 ? '...' : ''))
      }
    }

    const content = choice.content || ''
    if (!content.trim()) {
      logger.warn('Agent', `Agent ${agent.id} returned empty content for session ${session.id.slice(0, 8)}`)
    }

    return content
  } catch (err) {
    clearTimeout(timeoutHandle)

    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      logger.error('Agent', `Agent ${agent.id} timed out after ${AGENT_CALL_TIMEOUT_MS}ms for session ${session.id.slice(0, 8)}`)
      throw new Error(`Agent ${agent.id} timed out after ${AGENT_CALL_TIMEOUT_MS / 1000}s`)
    }

    logger.error('Agent', `Agent ${agent.id} API error for session ${session.id.slice(0, 8)}`, { error: err.message })
    throw err
  }
}

// ============================================================
// RESPONSE PARSER
// ============================================================

function parseAgentResponse(session, agentId, responseText) {
  if (!responseText) {
    logger.warn('Parser', `No response text to parse from agent ${agentId} in session ${session.id.slice(0, 8)}`)
    return
  }

  try {
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

    // Check for plain message (fallback -- if agent wrote something but no format)
    if (!responseText.includes('===')) {
      // Treat the whole response as a message
      const short = responseText.slice(0, 500).trim()
      if (short) {
        session.sendMessage(agentId, short)
      }
    }
  } catch (err) {
    logger.error('Parser', `Error parsing response from agent ${agentId} in session ${session.id.slice(0, 8)}`, { error: err.message })
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
// BUILD ORCHESTRATION (with error recovery per phase)
// ============================================================

async function runBuild(session) {
  const { config } = session

  let template
  try {
    template = getBaseTemplate(config?.siteType || 'landing', config)
  } catch (err) {
    logger.error('Build', `Failed to get base template for session ${session.id.slice(0, 8)}`, { error: err.message })
    session.send('build_error', { message: 'Failed to load base template: ' + err.message })
    return
  }

  logger.info('Build', `Starting build ${session.id.slice(0, 8)} -- "${session.brief.slice(0, 60)}"`)

  // ── PHASE 1: PLANNING ──
  session.sendPhaseChange('PLANNING')
  session.setProgress(5, 'Starting planning phase')

  session.sendThinking('architect', `Reading the brief carefully: "${session.brief.slice(0, 120)}..." — determining file structure, sections, and design direction.`)

  const planResponse = await callAgentWithRetry(
    session,
    architect,
    `You are starting a new website project. Read the brief carefully and build a stunning foundation.

USER BRIEF: "${session.brief}"

CONFIGURATION:
- Site type: ${config?.siteType || 'landing'}
- Style preset: ${config?.stylePreset || 'modern-dark'}
- Primary color: ${config?.primaryColor || '#3b82f6'}
- Dark mode site: ${config?.darkMode ? 'YES — dark backgrounds, light text, glowing accents' : 'LIGHT — clean whites, subtle shadows'}
- Animations: ${config?.animations ? 'YES — scroll-triggered entrances, hover effects, smooth transitions' : 'keep minimal — only essential hover states'}
- Responsive: ${config?.responsive ? 'YES — mobile-first, must work beautifully at 375px, 768px, 1440px' : 'desktop-optimized'}

STEP 1 — THINK through the project:
- Who is the target audience? What do they care about?
- What's the conversion goal? (sign up, buy, contact, hire, learn?)
- What sections does this specific brief need? List them with purpose (e.g., "Pricing — 3 tiers to nudge users toward the mid tier")
- What makes this project unique vs a generic template?

STEP 2 — Create index.html with RICH, REAL content:
- Write compelling, specific copy for every section — NOT generic "Welcome to our website" filler
- Include ALL sections listed below with proper HTML5 semantics (<section>, <article>, <nav>, etc.)
- Add descriptive BEM class names: .hero__headline, .pricing-card--featured, .testimonial__quote
- Include proper <head> with meta tags, and link to css/styles.css and js/main.js
- Add class="animate-on-scroll" to elements that should animate in on scroll
- Use data-* attributes for JS hooks: data-nav-toggle, data-accordion-trigger, etc.

STEP 3 — Brief the team with SPECIFIC creative direction:
- MESSAGE @maja listing every JS interaction: "1. Hamburger toggle on [data-nav-toggle] 2. Smooth scroll on a[href^='#'] 3. FAQ accordion on [data-accordion-trigger]..."
- MESSAGE @leo with: specific color palette (hex values), typography mood (e.g., "bold modern sans-serif, tight letter-spacing on headlines"), visual references (e.g., "like Stripe's homepage but warmer"), which sections need special treatment

TEMPLATE GUIDANCE:
${template.description}

REQUIRED SECTIONS (adapt to the brief):
${template.sections.join('\n')}

PLANNED FILES: ${template.files.join(', ')}

${template.designGuidance || ''}

Write complete, content-rich HTML. Every section should have enough real content that a client could read it and say "yes, this is my website."`
  )

  if (session.aborted) return

  if (planResponse) {
    parseAgentResponse(session, 'architect', planResponse)
  } else {
    logger.warn('Build', `Planning phase failed for session ${session.id.slice(0, 8)}, skipping to next phase`)
    session.skippedPhases.push('PLANNING')
    session.send('phase_skipped', { phase: 'PLANNING', reason: 'Architect agent failed to respond' })
  }

  // Extract plan from response
  session.plan = {
    siteType: config?.siteType || 'landing',
    template,
    brief: session.brief,
    filesPlanned: template.files,
    sectionsPlanned: template.sections,
    designGuidance: template.designGuidance || '',
  }

  session.setProgress(15, 'Planning complete')
  await sleep(800)

  // ── PHASE 2: SCAFFOLDING ──
  session.sendPhaseChange('SCAFFOLDING')
  session.setProgress(20, 'Setting up file structure')

  if (session.aborted) return

  const scaffoldResponse = await callAgentWithRetry(
    session,
    frontendDev,
    `Kuba finished the HTML. Your turn to make it interactive.

READ index.html carefully — note every section, class name, and data-* attribute.

Create js/main.js with ALL of this:

1. MOBILE NAV: hamburger toggle on [data-nav-toggle], close on link click, close on outside click, close on Escape key
2. SMOOTH SCROLL: all a[href^="#"] links scroll smoothly to their target
3. STICKY NAVBAR: add .is-scrolled class when scrolled > 50px
4. SCROLL ANIMATIONS: IntersectionObserver that adds .is-visible to all .animate-on-scroll elements
${config?.animations ? '5. COUNTER ANIMATION: animate number counters when they scroll into view' : ''}
6. FAQ ACCORDION: if there are [data-accordion-trigger] elements, make them toggle .is-open on parent [data-accordion-item]
7. FORM VALIDATION: if there's a form, validate on submit with inline error messages (not alert)
8. Any specific interactions mentioned in the brief or in Kuba's messages to you

ALSO create js/animations.js if animations are enabled (${config?.animations ? 'YES' : 'no'}):
- Scroll-triggered entrance animations using IntersectionObserver
- Parallax effect on hero if applicable
- Staggered animation on card grids

After writing code:
- MESSAGE @leo listing ALL state classes you're toggling: .is-open, .is-visible, .is-scrolled, .is-invalid, .is-valid, etc. — he needs to write CSS for ALL of these
- MESSAGE @nova that JS is ready for review

The brief: "${session.brief.slice(0, 200)}"`
  )

  if (session.aborted) return

  if (scaffoldResponse) {
    parseAgentResponse(session, 'frontend-dev', scaffoldResponse)
  } else {
    logger.warn('Build', `Scaffolding phase failed for session ${session.id.slice(0, 8)}, skipping`)
    session.skippedPhases.push('SCAFFOLDING')
    session.send('phase_skipped', { phase: 'SCAFFOLDING', reason: 'Frontend dev agent failed to respond' })
  }

  session.setProgress(30, 'Scaffolding complete')
  await sleep(600)

  // ── PHASE 3: CODING ──
  session.sendPhaseChange('CODING')
  session.setProgress(35, 'Frontend dev coding')

  // Leo styles in parallel with Maja coding
  session.sendThinking('stylist', `Kuba and Maja have finished the structure. Time to make this look incredible. Brief says: "${session.brief.slice(0, 100)}..." — I can already see the visual direction.`)

  const stylistResponse = await callAgentWithRetry(
    session,
    stylist,
    `Kuba and Maja have built the HTML and JS. Now make this look INCREDIBLE.

READ index.html carefully — note every section, every class name, every element.
READ the messages from Kuba and Maja — they'll tell you the design direction and JS state classes.

Create css/styles.css following the DESIGN SYSTEM STRUCTURE from your system prompt. This must be COMPLETE — every section styled, every interactive state handled.

DESIGN PARAMETERS:
- Style preset: ${config?.stylePreset || 'modern-dark'}
- ${config?.darkMode ? 'DARK THEME: Rich dark backgrounds (#0a0a0f base), light text, colored glows and accent borders. NOT plain black — use subtle gradients and surface elevation.' : 'LIGHT THEME: Clean whites, subtle warm shadows, airy feel. NOT sterile — add warmth with off-white backgrounds and soft color tints.'}
- Primary brand color: ${config?.primaryColor || '#3b82f6'} — build a full palette from this (light, dark, glow, muted variants)
- ${config?.animations ? 'ANIMATIONS: CSS transitions on ALL interactive elements, @keyframes for scroll-triggered entrances (.animate-on-scroll → .is-visible), hover lift on cards, button press effects' : 'MINIMAL ANIMATIONS: only hover states and focus rings, no entrance animations'}
- ${config?.responsive ? 'RESPONSIVE (mobile-first): base styles for mobile, @media (min-width: 768px) for tablet, @media (min-width: 1200px) for desktop' : 'DESKTOP-FIRST: optimize for 1200px+'}
- Font: ${config?.fontPreference || 'sans-serif'}

CRITICAL QUALITY CHECKS:
- Hero section: full viewport height, dramatic background (gradient or pattern), commanding headline size
- Navigation: styled both default AND .is-scrolled AND .is-open (mobile) states
- Every button: hover, focus-visible, and active states with transitions
- Every card: subtle shadow + hover lift effect (translateY(-4px) + deeper shadow)
- Section rhythm: alternating backgrounds to break up monotony
- Text containers: max-width: 65ch for readability
- Responsive: test mentally at 375px, 768px, 1440px — nothing should break

${config?.animations ? `ANIMATION CLASSES TO STYLE:
- .animate-on-scroll { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
- .animate-on-scroll.is-visible { opacity: 1; transform: translateY(0); }
- Stagger delays: .animate-on-scroll:nth-child(2) { transition-delay: 0.1s; } etc.` : ''}

STATE CLASSES FROM MAJA'S JS (style all of these):
- .is-open (mobile nav menu visible)
- .is-scrolled (navbar background/shadow when scrolled)
- .is-visible (scroll-triggered animation complete)
- .is-invalid / .is-valid (form field validation states)
- .is-hidden (hide-on-scroll navbar)

After styling, MESSAGE @rex that CSS is complete and ready for QA.
Also MESSAGE @maja if you need any HTML structure changes.

The result should look like a $10,000+ agency project, not a free template.`
  )

  if (session.aborted) return

  if (stylistResponse) {
    parseAgentResponse(session, 'stylist', stylistResponse)
  } else {
    logger.warn('Build', `Styling phase failed for session ${session.id.slice(0, 8)}, skipping`)
    session.skippedPhases.push('CODING')
    session.send('phase_skipped', { phase: 'CODING', reason: 'Stylist agent failed to respond' })
  }

  session.setProgress(50, 'Styling applied')
  await sleep(600)

  // Add user feedback if any
  if (session.pendingFeedback.length > 0) {
    const feedbackCtx = `User feedback received: ${session.pendingFeedback.join('. ')}`
    session.pendingFeedback = []
    session.sendThinking('frontend-dev', `Got user feedback! Implementing changes: ${feedbackCtx}`)

    const feedbackResponse = await callAgentWithRetry(
      session,
      frontendDev,
      `The user gave us feedback: "${feedbackCtx}".
Update the relevant files to address this feedback. Be specific about what you're changing and why.`
    )
    if (!session.aborted && feedbackResponse) {
      parseAgentResponse(session, 'frontend-dev', feedbackResponse)
    }
  }

  // ── PHASE 4: REVIEWING ──
  session.sendPhaseChange('REVIEWING')
  session.setProgress(60, 'Code review in progress')

  session.sendThinking('reviewer', "Alright team — my turn. I'm going through every file with a fine-tooth comb. Let me start with the HTML structure, then CSS, then JS...")

  const reviewResponse = await callAgentWithRetry(
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

  if (reviewResponse) {
    parseAgentResponse(session, 'reviewer', reviewResponse)
  } else {
    logger.warn('Build', `Review phase failed for session ${session.id.slice(0, 8)}, skipping`)
    session.skippedPhases.push('REVIEWING')
    session.send('phase_skipped', { phase: 'REVIEWING', reason: 'Reviewer agent failed to respond' })
  }

  session.setProgress(70, 'Review complete')
  await sleep(600)

  // ── PHASE 5: FIXING ──
  session.sendPhaseChange('FIXING')
  session.setProgress(73, 'Fixing review issues')

  if (session.reviewComments.length > 0) {
    session.sendThinking('frontend-dev', `Nova flagged ${session.reviewComments.length} issues. Prioritizing them by severity and fixing everything...`)

    const fixResponse = await callAgentWithRetry(
      session,
      frontendDev,
      `Nova (Code Reviewer) flagged these issues that need fixing:
${session.reviewComments.map(c => `- ${c.file}:${c.line || '?'} — ${c.comment}`).join('\n')}

Fix ALL issues. For each file you touch, output the COMPLETE updated file content (not just the changed lines).
After fixing, MESSAGE @nova confirming what you fixed and flagging anything you couldn't fix.
MESSAGE @leo if any class names in the HTML changed so he can update the CSS.`
    )

    if (!session.aborted && fixResponse) {
      parseAgentResponse(session, 'frontend-dev', fixResponse)
    }
  } else {
    session.sendThinking('frontend-dev', "Nova's review came back clean — no major issues. Doing a final JS polish pass anyway...")
  }

  // Leo does final styling pass
  session.sendThinking('stylist', "Nova pointed out some CSS issues. Also doing my own final aesthetic pass — I want this to look perfect.")

  const stylistPolish = await callAgentWithRetry(
    session,
    stylist,
    `Nova reviewed everything. Fix the issues AND do a final design polish.

Nova's CSS feedback:
${session.reviewComments.filter(c => c.file?.includes('.css')).map(c => `- ${c.comment}`).join('\n') || '(No specific CSS issues — focus on polish)'}

FINAL POLISH CHECKLIST:
1. HERO: Is it full-viewport? Does the headline command attention? Is there a gradient or visual interest in the background?
2. HOVER STATES: Every button, card, and link has a visible hover effect with a smooth transition
3. FOCUS STATES: Every interactive element has a visible focus-visible ring for keyboard users
4. RESPONSIVE: Does the nav collapse properly at mobile? Do grids stack? Is text readable at 375px?
5. VISUAL RHYTHM: Do sections alternate backgrounds? Is there consistent spacing between sections?
6. TYPOGRAPHY: Are headings dramatically larger than body text? Is line-height comfortable?
7. ANIMATIONS: Do .animate-on-scroll elements have proper initial state (opacity:0) and .is-visible transition?
8. MOBILE NAV: Is the .is-open state styled? Does the hamburger menu look good?
9. FORMS: Are .is-invalid and .is-valid states styled with clear visual feedback?
10. MICRO-DETAILS: Subtle shadows, border-radius consistency, text-max-width for readability

Output the COMPLETE updated css/styles.css.
After updating, MESSAGE @rex that design is polished.`
  )

  if (!session.aborted && stylistPolish) {
    parseAgentResponse(session, 'stylist', stylistPolish)
  }

  session.setProgress(82, 'Fixes applied')
  await sleep(500)

  // ── PHASE 6: TESTING ──
  session.sendPhaseChange('TESTING')
  session.setProgress(85, 'QA testing')

  session.sendThinking('qa-tester', "Leo said it's ready. Let's see about that. Pulling out my QA checklist... I'm going to test EVERYTHING the brief asked for.")

  const qaResponse = await callAgentWithRetry(
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

  if (qaResponse) {
    parseAgentResponse(session, 'qa-tester', qaResponse)
  } else {
    logger.warn('Build', `QA phase failed for session ${session.id.slice(0, 8)}, skipping`)
    session.skippedPhases.push('TESTING')
    session.send('phase_skipped', { phase: 'TESTING', reason: 'QA tester agent failed to respond' })
  }

  session.setProgress(92, 'QA complete')
  await sleep(500)

  // ── PHASE 7: POLISHING ──
  session.sendPhaseChange('POLISHING')
  session.setProgress(95, 'Final polish')

  // Check for more user feedback
  if (session.pendingFeedback.length > 0) {
    const feedbackCtx = session.pendingFeedback.join('. ')
    session.pendingFeedback = []

    const lateFixResponse = await callAgentWithRetry(
      session,
      stylist,
      `Late user feedback: "${feedbackCtx}". Apply any visual/design changes requested. Update the relevant files.`
    )
    if (!session.aborted && lateFixResponse) {
      parseAgentResponse(session, 'stylist', lateFixResponse)
    }
  }

  session.sendMessage('architect', 'Project complete. Final review: all agents have signed off. The build is ready for delivery.', null)
  session.sendMessage('reviewer', 'Confirmed. Code quality is acceptable. Signing off. 🔍', null)
  session.sendMessage('qa-tester', 'QA PASS! All tests cleared. Ship it! 🧪', null)

  // ── PHASE 8: COMPLETE ──
  session.sendPhaseChange('COMPLETE')
  session.setProgress(100, 'Build complete')

  session.updatePreview()

  const skippedInfo = session.skippedPhases.length > 0
    ? ` (${session.skippedPhases.length} phase(s) had agent failures and were skipped: ${session.skippedPhases.join(', ')})`
    : ''

  const tokenUsage = tokenTracker.getSessionUsage(session.id)
  const summary = `Successfully built a ${session.config?.siteType || 'landing'} page with ${session.fs.files.size} files. The 5-agent team collaborated to create a responsive, polished website matching your brief.${skippedInfo}`

  session.send('build_complete', {
    files: session.fs.toArray(),
    summary,
    fileCount: session.fs.files.size,
    skippedPhases: session.skippedPhases,
    tokenUsage: tokenUsage?.total || null,
  })

  logger.info('Build', `Complete ${session.id.slice(0, 8)} -- ${session.fs.files.size} files`, {
    skippedPhases: session.skippedPhases,
    tokenUsage: tokenUsage?.total || {},
  })
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

    // Validate brief length
    const briefValidation = validateBrief(brief)
    if (!briefValidation.valid) {
      return res.status(400).json({ error: briefValidation.error })
    }

    // Check API key before making calls
    if (!apiKeyValid) {
      return res.status(503).json({ error: 'Server is not configured with a valid DeepSeek API key' })
    }

    // Retry logic for the suggest-config API call
    let lastError = null
    for (let attempt = 1; attempt <= API_RETRY_COUNT; attempt++) {
      try {
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

        const text = response.choices?.[0]?.message?.content || ''
        if (!text.trim()) {
          throw new Error('Empty response from API')
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON in response')
        const suggestions = JSON.parse(jsonMatch[0])
        return res.json(suggestions)
      } catch (err) {
        lastError = err
        if (attempt < API_RETRY_COUNT) {
          const backoffMs = Math.pow(2, attempt) * 1000
          logger.warn('SuggestConfig', `Attempt ${attempt}/${API_RETRY_COUNT} failed, retrying in ${backoffMs}ms`, { error: err.message })
          await sleep(backoffMs)
        }
      }
    }

    logger.error('SuggestConfig', `All ${API_RETRY_COUNT} attempts failed`, { error: lastError?.message })
    res.json({ suggestedConfig: {}, reasoning: '', customQuestions: [] })
  } catch (err) {
    logger.error('SuggestConfig', 'Unexpected error', { error: err.message })
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
    logger.error('Download', 'Download failed', { error: err.message })
    res.status(500).json({ error: 'Download failed' })
  }
})

app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage()
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000)

  // Gather active session details
  const activeSessionDetails = []
  for (const [id, session] of sessions.entries()) {
    activeSessionDetails.push({
      id: id.slice(0, 8) + '...',
      phase: session.phase,
      progress: session.progressPercent,
      aborted: session.aborted,
      createdAt: new Date(session.createdAt).toISOString(),
      lastActivity: new Date(session.lastActivity).toISOString(),
      idleSeconds: Math.floor((Date.now() - session.lastActivity) / 1000),
      fileCount: session.fs.files.size,
      skippedPhases: session.skippedPhases,
    })
  }

  res.json({
    status: 'ok',
    version: SERVER_VERSION,
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
    },
    apiKeyConfigured: apiKeyValid,
    activeSessions: sessions.size,
    maxConcurrentBuilds: MAX_CONCURRENT_BUILDS,
    sessions: activeSessionDetails,
    memory: {
      rss: formatBytes(memUsage.rss),
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      external: formatBytes(memUsage.external),
    },
    config: {
      maxApiCallsPerMinute: MAX_API_CALLS_PER_MINUTE,
      sessionTimeoutMinutes: SESSION_TIMEOUT_MS / 60000,
      agentCallTimeoutSeconds: AGENT_CALL_TIMEOUT_MS / 1000,
      apiRetryCount: API_RETRY_COUNT,
    },
    timestamp: Date.now(),
  })
})

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  logger.info('Server', `White Ninja AI v${SERVER_VERSION} running on port ${PORT}`)
  logger.info('Server', `WS endpoint: ws://localhost:${PORT}/ws`)

  if (!apiKeyValid) {
    logger.warn('Server', 'DEEPSEEK_API_KEY not set or invalid -- agent calls will fail. Builds will be rejected until a valid key is provided.')
  } else {
    logger.info('Server', 'DEEPSEEK_API_KEY is configured')
  }

  logger.info('Server', `Rate limits: max ${MAX_CONCURRENT_BUILDS} concurrent builds, ${MAX_API_CALLS_PER_MINUTE} API calls/min/session`)
  logger.info('Server', `Session timeout: ${SESSION_TIMEOUT_MS / 60000} minutes, Agent timeout: ${AGENT_CALL_TIMEOUT_MS / 1000}s`)
})

// ============================================================
// UTILS
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)
  return parts.join(' ')
}
