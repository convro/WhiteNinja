import './AgentAvatar.css'

const AGENT_META = {
  architect: { emoji: '🏗️', name: 'Kuba', color: '#3b82f6', role: 'Architect' },
  'frontend-dev': { emoji: '⚡', name: 'Maja', color: '#22c55e', role: 'Frontend Dev' },
  stylist: { emoji: '🎨', name: 'Leo', color: '#a855f7', role: 'CSS Stylist' },
  reviewer: { emoji: '🔍', name: 'Nova', color: '#ef4444', role: 'Code Reviewer' },
  'qa-tester': { emoji: '🧪', name: 'Rex', color: '#eab308', role: 'QA Tester' },
}

export function getAgentMeta(agentId) {
  return AGENT_META[agentId] || { emoji: '🤖', name: agentId, color: '#8b98a8', role: 'Agent' }
}

export default function AgentAvatar({ agentId, size = 'md', showName = false, showRole = false }) {
  const meta = getAgentMeta(agentId)
  const sizeClass = `agent-avatar--${size}`

  return (
    <div className={`agent-avatar-wrap ${showName || showRole ? 'agent-avatar-wrap--labeled' : ''}`}>
      <div
        className={`agent-avatar ${sizeClass}`}
        style={{ '--color': meta.color }}
        title={`${meta.name} — ${meta.role}`}
      >
        <span className="agent-avatar-emoji">{meta.emoji}</span>
        <div className="agent-avatar-ring" />
      </div>
      {(showName || showRole) && (
        <div className="agent-avatar-labels">
          {showName && <span className="agent-avatar-name" style={{ color: meta.color }}>{meta.name}</span>}
          {showRole && <span className="agent-avatar-role">{meta.role}</span>}
        </div>
      )}
    </div>
  )
}
