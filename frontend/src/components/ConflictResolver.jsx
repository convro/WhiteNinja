import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { getAgentMeta } from './AgentAvatar.jsx'
import './ConflictResolver.css'

export default function ConflictResolver({ conflict, onResolve }) {
  const [customSolution, setCustomSolution] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const agentAMeta = getAgentMeta(conflict.agentA?.agentId)
  const agentBMeta = getAgentMeta(conflict.agentB?.agentId)

  const handleResolve = (choice) => {
    onResolve(conflict.id, choice, choice === 'custom' ? customSolution : '')
  }

  return (
    <motion.div
      className="conflict-resolver"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="conflict-header">
        <AlertTriangle size={14} />
        <span>Agent Conflict — Your Vote Needed</span>
      </div>

      <p className="conflict-about">{conflict.about}</p>

      <div className="conflict-options">
        {/* Option A */}
        <div className="conflict-option" style={{ '--color': agentAMeta.color }}>
          <div className="conflict-option-header">
            <span className="conflict-option-agent" style={{ color: agentAMeta.color }}>
              {agentAMeta.emoji} {agentAMeta.name}
            </span>
            <span className="conflict-option-role">{agentAMeta.role}</span>
          </div>
          <p className="conflict-option-proposal">{conflict.agentA?.proposal}</p>
          <button
            className="btn btn-sm conflict-vote-btn"
            style={{ background: `${agentAMeta.color}20`, color: agentAMeta.color, borderColor: `${agentAMeta.color}40` }}
            onClick={() => handleResolve('agent_a')}
          >
            <CheckCircle size={12} />
            Go with {agentAMeta.name}
          </button>
        </div>

        <div className="conflict-vs">VS</div>

        {/* Option B */}
        <div className="conflict-option" style={{ '--color': agentBMeta.color }}>
          <div className="conflict-option-header">
            <span className="conflict-option-agent" style={{ color: agentBMeta.color }}>
              {agentBMeta.emoji} {agentBMeta.name}
            </span>
            <span className="conflict-option-role">{agentBMeta.role}</span>
          </div>
          <p className="conflict-option-proposal">{conflict.agentB?.proposal}</p>
          <button
            className="btn btn-sm conflict-vote-btn"
            style={{ background: `${agentBMeta.color}20`, color: agentBMeta.color, borderColor: `${agentBMeta.color}40` }}
            onClick={() => handleResolve('agent_b')}
          >
            <CheckCircle size={12} />
            Go with {agentBMeta.name}
          </button>
        </div>
      </div>

      {/* Custom solution */}
      <div className="conflict-custom">
        {!showCustom ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCustom(true)}>
            Write my own solution
          </button>
        ) : (
          <div className="conflict-custom-input">
            <textarea
              className="input"
              placeholder="Describe your own solution..."
              value={customSolution}
              onChange={e => setCustomSolution(e.target.value)}
              rows={2}
            />
            <div className="conflict-custom-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCustom(false)}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!customSolution.trim()}
                onClick={() => handleResolve('custom')}
              >
                Submit My Solution
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
