import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AgentMessage from './AgentMessage.jsx'
import ConflictResolver from './ConflictResolver.jsx'
import './AgentFeed.css'

export default function AgentFeed({ messages, conflicts, onResolveConflict, phase }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const activeConflict = conflicts.find(c => !c.resolved)

  return (
    <div className="agent-feed">
      <div className="agent-feed-header">
        <span className="agent-feed-title">Agent Activity</span>
        {phase && (
          <div className="agent-feed-phase">
            <div className="agent-feed-phase-dot" />
            <span>{phase}</span>
          </div>
        )}
      </div>

      <div className="agent-feed-scroll">
        {messages.length === 0 && (
          <div className="agent-feed-empty">
            <div className="loading-dots">
              <span /><span /><span />
            </div>
            <p>Agents are preparing...</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={msg.id || i}>
              {msg.type === 'phase_change' ? (
                <PhaseChangeMarker from={msg.from} to={msg.to} />
              ) : (
                <AgentMessage message={msg} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {activeConflict && (
          <ConflictResolver
            conflict={activeConflict}
            onResolve={onResolveConflict}
          />
        )}

        <div ref={endRef} />
      </div>
    </div>
  )
}

function PhaseChangeMarker({ from, to }) {
  return (
    <div className="phase-marker">
      <div className="phase-marker-line" />
      <div className="phase-marker-content">
        <span className="phase-marker-from">{from}</span>
        <span className="phase-marker-arrow">→</span>
        <span className="phase-marker-to">{to}</span>
      </div>
      <div className="phase-marker-line" />
    </div>
  )
}
