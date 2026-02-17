import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Send, Pause, Play, Home, Wifi, WifiOff } from 'lucide-react'
import { useBuilderSocket } from '../hooks/useBuilderSocket.jsx'
import { useFileSystem } from '../hooks/useFileSystem.jsx'
import AgentFeed from '../components/AgentFeed.jsx'
import FileTree from '../components/FileTree.jsx'
import LivePreview from '../components/LivePreview.jsx'
import BuildProgress from '../components/BuildProgress.jsx'
import './BuildScreen.css'

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
  const [activePanel, setActivePanel] = useState('feed') // mobile tabs
  const [buildStarted, setBuildStarted] = useState(false)

  const msgIdRef = useRef(0)
  const addMsg = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: ++msgIdRef.current, timestamp: msg.timestamp || Date.now() }])
  }, [])

  // Set up WebSocket handlers
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

  // Start build when connected
  useEffect(() => {
    if (socket.connectionState === 'connected' && !buildStarted) {
      setBuildStarted(true)
      socket.startBuild(brief, config)
    }
  }, [socket.connectionState, buildStarted, socket, brief, config])

  const handleSendFeedback = useCallback(() => {
    if (!feedback.trim()) return
    socket.sendFeedback(feedback.trim())
    addMsg({
      type: 'agent_message',
      agentId: 'user',
      message: feedback.trim(),
    })
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
          <div className="build-logo">
            <span>WN</span>
          </div>
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

        {/* Center: Agent Feed */}
        <div className={`build-panel build-panel--feed ${activePanel === 'feed' ? 'mobile-active' : ''}`}>
          <AgentFeed
            messages={messages}
            conflicts={conflicts}
            onResolveConflict={handleResolveConflict}
            phase={buildPhase}
          />

          {/* Feedback input */}
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
      </div>
    </div>
  )
}

function buildSrcdoc(html, css, js) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${css || ''}</style>
</head>
<body>
${html || ''}
<script>${js || ''}<\/script>
</body>
</html>`
}
