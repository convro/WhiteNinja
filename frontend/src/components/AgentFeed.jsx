import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AgentMessage from './AgentMessage.jsx'
import ConflictResolver from './ConflictResolver.jsx'
import './AgentFeed.css'

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'files', label: 'Files' },
  { id: 'messages', label: 'Messages' },
]

const GROUP_THRESHOLD_MS = 30000

function groupMessages(messages) {
  const groups = []
  let current = null

  for (const msg of messages) {
    if (msg.type === 'phase_change') {
      if (current) {
        groups.push(current)
        current = null
      }
      groups.push({ type: 'phase_change', msg })
      continue
    }

    const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0
    if (
      current &&
      current.agentId === msg.agentId &&
      ts - current.lastTs < GROUP_THRESHOLD_MS
    ) {
      current.messages.push(msg)
      current.lastTs = ts
    } else {
      if (current) groups.push(current)
      current = {
        type: 'group',
        agentId: msg.agentId,
        messages: [msg],
        firstTs: ts,
        lastTs: ts,
      }
    }
  }
  if (current) groups.push(current)
  return groups
}

function matchesFilter(msg, filter) {
  if (filter === 'all') return true
  if (filter === 'thinking') return msg.type === 'agent_thinking'
  if (filter === 'files')
    return msg.type === 'file_created' || msg.type === 'file_modified' || msg.type === 'file_deleted'
  if (filter === 'messages')
    return msg.type === 'agent_message' || msg.type === 'review_comment' || msg.type === 'bug_report'
  return true
}

export default function AgentFeed({ messages, conflicts, onResolveConflict, phase }) {
  const scrollRef = useRef(null)
  const endRef = useRef(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const prevLenRef = useRef(messages.length)

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages
    return messages.filter(m => m.type === 'phase_change' || matchesFilter(m, filter))
  }, [messages, filter])

  const grouped = useMemo(() => groupMessages(filteredMessages), [filteredMessages])

  const checkIfScrolledUp = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 80
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setIsUserScrolledUp(!atBottom)
    if (atBottom) setUnreadCount(0)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkIfScrolledUp, { passive: true })
    return () => el.removeEventListener('scroll', checkIfScrolledUp)
  }, [checkIfScrolledUp])

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      if (isUserScrolledUp) {
        setUnreadCount(prev => prev + (messages.length - prevLenRef.current))
      } else {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }
    prevLenRef.current = messages.length
  }, [messages.length, isUserScrolledUp])

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    setUnreadCount(0)
    setIsUserScrolledUp(false)
  }

  const activeConflict = conflicts.find(c => !c.resolved)

  return (
    <div className="agent-feed">
      <div className="agent-feed-header">
        <div className="agent-feed-header-top">
          <span className="agent-feed-title">Agent Activity</span>
          {phase && (
            <div className="agent-feed-phase">
              <div className="agent-feed-phase-dot" />
              <span>{phase}</span>
            </div>
          )}
        </div>
        <div className="agent-feed-filters">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              className={`agent-feed-filter-btn ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="agent-feed-scroll" ref={scrollRef}>
        {filteredMessages.length === 0 && messages.length === 0 && (
          <div className="agent-feed-empty">
            <div className="agent-feed-empty-icon">
              <div className="agent-feed-brain">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2a3.5 3.5 0 0 0-3.2 4.8A3.5 3.5 0 0 0 4 10.5a3.5 3.5 0 0 0 1.3 2.7A3.5 3.5 0 0 0 4 16a3.5 3.5 0 0 0 3.5 3.5h1V22h5v-2.5h1A3.5 3.5 0 0 0 18 16a3.5 3.5 0 0 0-1.3-2.7A3.5 3.5 0 0 0 18 10.5a3.5 3.5 0 0 0-2.3-3.7A3.5 3.5 0 0 0 12.5 2h-3z" />
                  <path d="M9.5 8.5h5" />
                  <path d="M9.5 12.5h5" />
                </svg>
              </div>
            </div>
            <p>Agents are warming up...</p>
            <div className="agent-feed-empty-loader">
              <div className="agent-feed-empty-bar" />
            </div>
          </div>
        )}

        {filteredMessages.length === 0 && messages.length > 0 && (
          <div className="agent-feed-empty">
            <p>No messages match this filter</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {grouped.map((group, gi) => {
            if (group.type === 'phase_change') {
              return (
                <motion.div
                  key={`phase-${gi}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <PhaseChangeMarker from={group.msg.from} to={group.msg.to} />
                </motion.div>
              )
            }

            return (
              <motion.div
                key={`group-${gi}`}
                className="agent-feed-group"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {group.messages.length > 1 && (
                  <div className="agent-feed-group-line" />
                )}
                {group.messages.map((msg, mi) => (
                  <motion.div
                    key={msg.id || `${gi}-${mi}`}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, delay: mi * 0.04 }}
                  >
                    <AgentMessage
                      message={msg}
                      isGrouped={group.messages.length > 1 && mi > 0}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {activeConflict && (
          <ConflictResolver
            conflict={activeConflict}
            onResolve={onResolveConflict}
          />
        )}

        <div ref={endRef} />
      </div>

      {/* New messages indicator */}
      <AnimatePresence>
        {isUserScrolledUp && unreadCount > 0 && (
          <motion.button
            className="agent-feed-new-indicator"
            onClick={scrollToBottom}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <span>{unreadCount} new message{unreadCount !== 1 ? 's' : ''}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

function PhaseChangeMarker({ from, to }) {
  return (
    <div className="phase-marker">
      <div className="phase-marker-line">
        <motion.div
          className="phase-marker-line-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <motion.div
        className="phase-marker-content"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
      >
        <span className="phase-marker-from">{from}</span>
        <span className="phase-marker-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
        <span className="phase-marker-to">{to}</span>
      </motion.div>
      <div className="phase-marker-line">
        <motion.div
          className="phase-marker-line-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </div>
    </div>
  )
}
