import { motion } from 'framer-motion'
import { FilePlus, FileEdit, Trash2, AlertTriangle, Bug, CheckCircle, MessageSquare, Brain } from 'lucide-react'
import AgentAvatar, { getAgentMeta } from './AgentAvatar.jsx'
import './AgentMessage.css'

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } }
}

function TypeIcon({ type }) {
  switch (type) {
    case 'agent_thinking': return <Brain size={12} />
    case 'file_created': return <FilePlus size={12} />
    case 'file_modified': return <FileEdit size={12} />
    case 'file_deleted': return <Trash2 size={12} />
    case 'agent_conflict': return <AlertTriangle size={12} />
    case 'bug_report': return <Bug size={12} />
    case 'review_comment': return <MessageSquare size={12} />
    case 'build_complete': return <CheckCircle size={12} />
    default: return <MessageSquare size={12} />
  }
}

export default function AgentMessage({ message }) {
  const { type, agentId, targetAgent } = message
  const meta = getAgentMeta(agentId)
  const targetMeta = targetAgent ? getAgentMeta(targetAgent) : null

  const isThinking = type === 'agent_thinking'
  const isFileOp = type === 'file_created' || type === 'file_modified' || type === 'file_deleted'
  const isConflict = type === 'agent_conflict'
  const isBug = type === 'bug_report'

  return (
    <motion.div
      className={`agent-msg ${isThinking ? 'agent-msg--thinking' : ''} ${isConflict ? 'agent-msg--conflict' : ''}`}
      style={{ '--agent-color': meta.color }}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      <div className="agent-msg-header">
        <AgentAvatar agentId={agentId} size="sm" />
        <span className="agent-msg-name" style={{ color: meta.color }}>{meta.name}</span>

        {targetMeta && (
          <>
            <span className="agent-msg-to">→</span>
            <span className="agent-msg-target" style={{ color: targetMeta.color }}>@{targetMeta.name}</span>
          </>
        )}

        <div className={`agent-msg-type-badge agent-msg-type--${type}`}>
          <TypeIcon type={type} />
          <span>{formatType(type)}</span>
        </div>

        <span className="agent-msg-time">{formatTime(message.timestamp)}</span>
      </div>

      {/* Thinking bubble */}
      {isThinking && (
        <div className="agent-msg-thinking">
          <div className="agent-msg-thinking-dots">
            <div className="loading-dots">
              <span /><span /><span />
            </div>
          </div>
          <p className="agent-msg-text">{message.thought}</p>
        </div>
      )}

      {/* Regular message */}
      {type === 'agent_message' && (
        <div className="agent-msg-bubble">
          <p className="agent-msg-text">{message.message}</p>
        </div>
      )}

      {/* File operations */}
      {isFileOp && (
        <div className={`agent-msg-file-op agent-msg-file-op--${type}`}>
          <div className="agent-msg-file-path">
            <TypeIcon type={type} />
            <code>{message.path}</code>
          </div>
          {message.reason && (
            <p className="agent-msg-reason">{message.reason}</p>
          )}
          {message.content && type === 'file_created' && (
            <div className="agent-msg-file-preview">
              <pre className="code-block">{truncateCode(message.content, 8)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Conflict */}
      {isConflict && (
        <div className="agent-msg-conflict">
          <div className="agent-msg-conflict-about">
            <AlertTriangle size={13} />
            <span>{message.about}</span>
          </div>
        </div>
      )}

      {/* Bug report */}
      {isBug && (
        <div className={`agent-msg-bug agent-msg-bug--${message.severity}`}>
          <div className="agent-msg-bug-header">
            <Bug size={12} />
            <span className="agent-msg-bug-severity">{message.severity?.toUpperCase()}</span>
          </div>
          <p className="agent-msg-text">{message.description}</p>
        </div>
      )}

      {/* Review comment */}
      {type === 'review_comment' && (
        <div className="agent-msg-review">
          {message.file && (
            <code className="agent-msg-review-file">
              {message.file}{message.line ? `:${message.line}` : ''}
            </code>
          )}
          <p className="agent-msg-text">{message.comment}</p>
        </div>
      )}

      {/* Build complete */}
      {type === 'build_complete' && (
        <div className="agent-msg-complete">
          <CheckCircle size={16} />
          <p className="agent-msg-text">{message.summary}</p>
        </div>
      )}

      {/* Phase change */}
      {type === 'phase_change' && (
        <div className="agent-msg-phase">
          <span className="agent-msg-phase-from">{message.from}</span>
          <span>→</span>
          <span className="agent-msg-phase-to">{message.to}</span>
        </div>
      )}
    </motion.div>
  )
}

function formatType(type) {
  const map = {
    agent_thinking: 'thinking',
    agent_message: 'message',
    file_created: 'created file',
    file_modified: 'modified file',
    file_deleted: 'deleted file',
    agent_conflict: 'conflict',
    review_comment: 'review',
    bug_report: 'bug',
    build_complete: 'done',
    phase_change: 'phase',
  }
  return map[type] || type
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function truncateCode(code, lines) {
  if (!code) return ''
  const arr = code.split('\n')
  if (arr.length <= lines) return code
  return arr.slice(0, lines).join('\n') + `\n... (${arr.length - lines} more lines)`
}
