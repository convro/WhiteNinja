import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Send, Pause, Play, Home, Wifi, WifiOff } from 'lucide-react'
import { useBuilderSocket } from '../hooks/useBuilderSocket.jsx'
import { useFileSystem } from '../hooks/useFileSystem.jsx'
import AgentFeed from '../components/AgentFeed.jsx'
import FileTree from '../components/FileTree.jsx'
import LivePreview from '../components/LivePreview.jsx'
import BuildProgress from '../components/BuildProgress.jsx'
import './BuildScreen.css'

const AGENT_META = {
  architect:      { name: 'Kuba', emoji: '🏗️', color: '#3b82f6' },
  'frontend-dev': { name: 'Maja', emoji: '⚡',  color: '#22c55e' },
  stylist:        { name: 'Leo',  emoji: '🎨', color: '#a855f7' },
  reviewer:       { name: 'Nova', emoji: '🔍', color: '#ef4444' },
  'qa-tester':    { name: 'Rex',  emoji: '🧪', color: '#eab308' },
  user:           { name: 'You',  emoji: '💬', color: '#64748b' },
}

function formatActivityLine(msg) {
  const meta = AGENT_META[msg.agentId] || { name: msg.agentId || 'System', emoji: '•', color: '#64748b' }
  switch (msg.type) {
    case 'agent_thinking':
      return { meta, text: (msg.thought || '').slice(0, 72) }
    case 'agent_message':
      return { meta, text: (msg.message || '').slice(0, 72) }
    case 'file_created':
      return { meta, text: `created ${msg.path}` }
    case 'file_modified':
      return { meta, text: `updated ${msg.path}` }
    case 'review_comment':
      return { meta, text: `reviewed ${msg.file || 'file'}` }
    case 'bug_report':
      return { meta, text: `[${msg.severity}] ${(msg.description || '').slice(0, 55)}` }
    case 'build_complete':
      return { meta: { ...meta, emoji: '✅', name: 'Team' }, text: 'Build complete! All agents signed off.' }
    default:
      return null
  }
}

function ActivityLog({ messages }) {
  const relevant = messages
    .filter(m => ['agent_thinking','agent_message','file_created','file_modified','review_comment','bug_report','build_complete'].includes(m.type))
    .slice(-5)

  if (relevant.length === 0) return null

  return (
    <div className="build-activity-log">
      <div className="build-activity-log-label">Live activity</div>
      <AnimatePresence initial={false} mode="popLayout">
        {relevant.map((msg) => {
          const line = formatActivityLine(msg)
          if (!line) return null
          return (
            <motion.div
              key={msg.id}
              className="build-activity-chip"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span className="build-activity-dot" style={{ background: line.meta.color }} />
              <span className="build-activity-agent" style={{ color: line.meta.color }}>
                {line.meta.emoji} {line.meta.name}
              </span>
              <span className="build-activity-text">{line.text}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default function BuildScreen({ brief, config, onComplete, onStartOver }) {
  const socket = useBuilderSocket()
  const fs = useFileSystem()

  const [messages, setMessages] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [previewHtml, setPreviewHtml] = useState(null)
  const [buildPhase, setBuildPhase] = useState('PLANNING')
  const [buildProgress, setBuildProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [activePanel, setActivePanel] = useState('feed')
  const [buildStarted, setBuildStarted] = useState(false)

  const msgIdRef = useRef(0)
  const addMsg = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: ++msgIdRef.current, timestamp: msg.timestamp || Date.now() }])
  }, [])

  useEffect(() => {
    const offs = [
      socket.on('agent_thinking', (msg) => addMsg(msg)),
      socket.on('agent_message', (msg) => addMsg(msg)),

      socket.on('file_created', (msg) => {
        fs.createFile(msg.path, msg.content, msg.agentId)
        addMsg(msg)
      }),
      socket.on('file_modified', (msg) => {
        fs.modifyFile(msg.path, msg.content, msg.agentId, msg.diff)
        addMsg(msg)
      }),
      socket.on('file_deleted', (msg) => {
        fs.deleteFile(msg.path)
        addMsg(msg)
      }),

      socket.on('agent_conflict', (msg) => {
        setConflicts(prev => [...prev, { ...msg, resolved: false }])
        addMsg(msg)
        toast.warning('Agents disagree — your vote needed!', { duration: 5000 })
      }),

      socket.on('review_comment', (msg) => addMsg(msg)),
      socket.on('bug_report', (msg) => {
        addMsg(msg)
        if (msg.severity === 'high') toast.error(`Bug found: ${msg.description}`, { duration: 4000 })
      }),

      socket.on('phase_change', (msg) => {
        addMsg(msg)
        setBuildPhase(msg.to)
        toast(`Phase: ${msg.to}`, { duration: 2000 })
      }),

      socket.on('build_progress', (msg) => {
        setBuildProgress(msg.percent)
      }),

      socket.on('preview_update', (msg) => {
        if (msg.html) setPreviewHtml(buildSrcdoc(msg.html, msg.css, msg.js))
      }),

      socket.on('build_complete', (msg) => {
        addMsg(msg)
        setBuildProgress(100)
        setBuildPhase('COMPLETE')
        toast.success('Build complete!', { duration: 3000 })
        setTimeout(() => onComplete(msg), 2000)
      }),
    ]

    return () => offs.forEach(off => off && off())
  }, [socket, fs, addMsg, onComplete])

  useEffect(() => {
    if (socket.connectionState === 'connected' && !buildStarted) {
      setBuildStarted(true)
      socket.startBuild(brief, config)
    }
  }, [socket.connectionState, buildStarted, socket, brief, config])

  const handleSendFeedback = useCallback(() => {
    if (!feedback.trim()) return
    socket.sendFeedback(feedback.trim())
    addMsg({ type: 'agent_message', agentId: 'user', message: feedback.trim() })
    setFeedback('')
    toast.success('Feedback sent to agents')
  }, [feedback, socket, addMsg])

  const handleResolveConflict = useCallback((conflictId, choice, customSolution) => {
    socket.resolveConflict(conflictId, choice, customSolution)
    setConflicts(prev => prev.map(c => c.id === conflictId ? { ...c, resolved: true } : c))
    toast.success('Conflict resolved — agents will adapt')
  }, [socket])

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      socket.resumeBuild()
      setIsPaused(false)
      toast('Build resumed')
    } else {
      socket.pauseBuild()
      setIsPaused(true)
      toast('Build paused')
    }
  }, [isPaused, socket])

  return (
    <div className="build-screen">
      {/* Top Bar */}
      <div className="build-topbar">
        <div className="build-topbar-left">
          <div className="build-logo"><span>WN</span></div>
          <div className="build-brief-summary">
            <span className="build-brief-text">{brief.slice(0, 60)}{brief.length > 60 ? '...' : ''}</span>
            <span className={`build-conn-indicator ${socket.connectionState}`}>
              {socket.connectionState === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
              {socket.connectionState}
            </span>
          </div>
        </div>

        <div className="build-topbar-center">
          <BuildProgress percent={buildProgress} phase={buildPhase} />
        </div>

        <div className="build-topbar-right">
          <button
            className={`btn btn-sm ${isPaused ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handlePauseResume}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onStartOver}>
            <Home size={13} />
          </button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="build-mobile-tabs">
        {['feed', 'preview', 'files'].map(tab => (
          <button
            key={tab}
            className={`build-mobile-tab ${activePanel === tab ? 'active' : ''}`}
            onClick={() => setActivePanel(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main 3-panel layout */}
      <div className="build-main">
        {/* Left: File Tree */}
        <div className={`build-panel build-panel--files ${activePanel === 'files' ? 'mobile-active' : ''}`}>
          <FileTree
            files={fs.files}
            selectedFile={fs.selectedFile}
            onSelectFile={fs.setSelectedFile}
          />
        </div>

        {/* Center: Agent Feed + Feedback */}
        <div className={`build-panel build-panel--feed ${activePanel === 'feed' ? 'mobile-active' : ''}`}>
          <AgentFeed
            messages={messages}
            conflicts={conflicts}
            onResolveConflict={handleResolveConflict}
            phase={buildPhase}
          />
          <div className="build-feedback">
            <input
              className="input build-feedback-input"
              placeholder="Give feedback to agents... (e.g. 'make the header bigger')"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendFeedback()}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSendFeedback}
              disabled={!feedback.trim()}
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className={`build-panel build-panel--preview ${activePanel === 'preview' ? 'mobile-active' : ''}`}>
          <LivePreview
            previewHtml={previewHtml}
            selectedFile={fs.selectedFile}
            files={fs.files}
          />
        </div>

        {/* Floating realtime activity log — bottom-left */}
        <ActivityLog messages={messages} />
      </div>
    </div>
  )
}

function buildSrcdoc(html, css, js) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Sora:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/lucide@latest"><\/script>
<style>
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
img { max-width: 100%; height: auto; display: block; }
${css || ''}
</style>
</head>
<body>
${html || ''}
<script>
try {
${js || ''}
} catch(e) { console.warn('[Preview]', e); }
try { lucide.createIcons(); } catch(e) {}
<\/script>
</body>
</html>`
}
