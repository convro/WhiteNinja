import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Eye, GitBranch, ShieldCheck } from 'lucide-react'
import './WelcomeScreen.css'

const AGENTS = [
  { name: 'Kuba', role: 'Architect', emoji: '🏗️', color: '#3b82f6' },
  { name: 'Maja', role: 'Frontend Dev', emoji: '⚡', color: '#22c55e' },
  { name: 'Leo', role: 'CSS Stylist', emoji: '🎨', color: '#a855f7' },
  { name: 'Nova', role: 'Reviewer', emoji: '🔍', color: '#ef4444' },
  { name: 'Rex', role: 'QA Tester', emoji: '🧪', color: '#eab308' },
]

const MOCK_FEED = [
  { agentIdx: 0, type: 'thinking', text: 'Analyzing brief — hero, pricing, testimonials. File structure: index.html + css/ + js/' },
  { agentIdx: 0, type: 'file', text: 'Created index.html' },
  { agentIdx: 1, type: 'msg', text: 'On it! Writing the JS interactions now — scroll animations, nav toggle, form validation...' },
  { agentIdx: 2, type: 'file', text: 'Created css/styles.css' },
  { agentIdx: 2, type: 'thinking', text: 'That primary color needs a stronger gradient. Adding a glassmorphism hero treatment.' },
  { agentIdx: 3, type: 'msg', text: 'Hero section looks good. Found 2 issues: missing alt text on images and nav not accessible.' },
  { agentIdx: 1, type: 'file', text: 'Updated index.html — fixed accessibility issues' },
  { agentIdx: 4, type: 'msg', text: 'QA PASS ✅ — all viewport sizes passing, interactions work. Ship it!' },
]

function MockFeed() {
  const [visible, setVisible] = useState([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (idx >= MOCK_FEED.length) {
      const reset = setTimeout(() => {
        setVisible([])
        setIdx(0)
      }, 3000)
      return () => clearTimeout(reset)
    }
    const t = setTimeout(() => {
      setVisible(prev => [...prev, { ...MOCK_FEED[idx], id: Date.now() }])
      setIdx(i => i + 1)
    }, idx === 0 ? 600 : 1100 + Math.random() * 600)
    return () => clearTimeout(t)
  }, [idx])

  return (
    <div className="welcome-mock-feed">
      <div className="welcome-mock-topbar">
        <div className="welcome-mock-dot" style={{ background: '#ef4444' }} />
        <div className="welcome-mock-dot" style={{ background: '#eab308' }} />
        <div className="welcome-mock-dot" style={{ background: '#22c55e' }} />
        <span className="welcome-mock-title">Agent Activity</span>
      </div>
      <div className="welcome-mock-messages">
        <AnimatePresence initial={false}>
          {visible.map((item) => {
            const agent = AGENTS[item.agentIdx]
            return (
              <motion.div
                key={item.id}
                className={`welcome-mock-msg welcome-mock-msg--${item.type}`}
                initial={{ opacity: 0, x: -10, y: 4 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <span className="welcome-mock-emoji">{agent.emoji}</span>
                <div className="welcome-mock-body">
                  <span className="welcome-mock-agent" style={{ color: agent.color }}>
                    {agent.name}
                  </span>
                  {item.type === 'file' && (
                    <span className="welcome-mock-badge">file</span>
                  )}
                  {item.type === 'thinking' && (
                    <span className="welcome-mock-badge welcome-mock-badge--think">thinking</span>
                  )}
                  <p className="welcome-mock-text">{item.text}</p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {visible.length < MOCK_FEED.length && (
          <div className="welcome-mock-cursor">
            <span /><span /><span />
          </div>
        )}
      </div>
    </div>
  )
}

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-bg-grid" />
      <div className="welcome-orb welcome-orb--blue" />
      <div className="welcome-orb welcome-orb--purple" />

      <div className="welcome-layout">
        {/* ── LEFT COLUMN ── */}
        <motion.div
          className="welcome-left"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Logo */}
          <div className="welcome-logo">
            <div className="welcome-logo-icon">
              <span>WN</span>
            </div>
            <div className="welcome-logo-text">
              <span className="welcome-logo-name">White Ninja</span>
              <span className="welcome-logo-sub">AI Website Builder</span>
            </div>
          </div>

          {/* Headline */}
          <div className="welcome-headline">
            <div className="welcome-tag">
              <span className="welcome-tag-dot" />
              5 AI agents working in parallel
            </div>
            <h1>
              Watch AI build<br />
              your website<br />
              <span className="gradient-text-accent">live.</span>
            </h1>
            <p className="welcome-subtitle">
              Not just a result — the entire process.
              Agents plan, code, argue, review, and polish
              while you watch every move in real-time.
            </p>
          </div>

          {/* Agent pills */}
          <div className="welcome-agent-pills">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.name}
                className="welcome-pill"
                style={{ '--agent-color': agent.color }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.07, type: 'spring', stiffness: 380, damping: 24 }}
              >
                <span>{agent.emoji}</span>
                <span className="welcome-pill-name">{agent.name}</span>
                <span className="welcome-pill-role">{agent.role}</span>
              </motion.div>
            ))}
          </div>

          {/* Features */}
          <div className="welcome-features">
            {[
              { icon: Eye,        text: 'Watch every agent thought & decision live' },
              { icon: GitBranch,  text: 'Real file system built in front of you' },
              { icon: ShieldCheck,text: 'Code review + QA pass before delivery' },
              { icon: Zap,        text: 'Live preview updates as agents code' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="welcome-feature-row">
                <Icon size={14} className="welcome-feature-icon" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="welcome-cta">
            <motion.button
              className="btn btn-primary welcome-btn-start"
              onClick={onStart}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Building
              <ArrowRight size={17} />
            </motion.button>
            <p className="welcome-cta-note">Free · No account needed · Takes ~2 min</p>
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN — Live demo ── */}
        <motion.div
          className="welcome-right"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <MockFeed />

          {/* Stats strip */}
          <div className="welcome-stats">
            {[
              { val: '5', label: 'AI Agents' },
              { val: '8', label: 'Build phases' },
              { val: '100%', label: 'Live process' },
            ].map(({ val, label }) => (
              <div key={label} className="welcome-stat">
                <span className="welcome-stat-val">{val}</span>
                <span className="welcome-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
