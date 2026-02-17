import { motion } from 'framer-motion'
import { Zap, Eye, Users, ArrowRight, Code2, Palette, ShieldCheck, TestTube2 } from 'lucide-react'
import './WelcomeScreen.css'

const AGENTS = [
  { id: 'architect', name: 'Kuba', role: 'Architect', emoji: '🏗️', color: '#3b82f6', desc: 'Plans structure & defines components' },
  { id: 'frontend-dev', name: 'Maja', role: 'Frontend Dev', emoji: '⚡', color: '#22c55e', desc: 'Writes HTML, JS & interactivity' },
  { id: 'stylist', name: 'Leo', role: 'CSS Stylist', emoji: '🎨', color: '#a855f7', desc: 'All visual design & animations' },
  { id: 'reviewer', name: 'Nova', role: 'Code Reviewer', emoji: '🔍', color: '#ef4444', desc: 'Reviews code & catches bugs' },
  { id: 'qa-tester', name: 'Rex', role: 'QA Tester', emoji: '🧪', color: '#eab308', desc: 'Tests the site & finds issues' },
]

const FEATURES = [
  { icon: Eye, label: 'Watch AI think', desc: 'See every thought, decision, and argument in real-time' },
  { icon: Users, label: '5 agents, 1 team', desc: 'Architect, Dev, Stylist, Reviewer & QA working together' },
  { icon: Code2, label: 'Live code output', desc: 'Files created and modified in real-time as you watch' },
  { icon: Zap, label: 'Instant preview', desc: 'See your website taking shape as agents build it' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
}

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="welcome-screen">
      {/* Background orbs */}
      <div className="welcome-orb welcome-orb--blue" />
      <div className="welcome-orb welcome-orb--purple" />
      <div className="welcome-orb welcome-orb--green" />

      <motion.div
        className="welcome-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div className="welcome-logo" variants={itemVariants}>
          <div className="welcome-logo-icon">
            <span>WN</span>
          </div>
          <div className="welcome-logo-text">
            <span className="welcome-logo-name">White Ninja</span>
            <span className="welcome-logo-sub">AI Website Builder</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div className="welcome-headline" variants={itemVariants}>
          <h1>
            Watch 5 AI agents<br />
            <span className="gradient-text-accent">build your website</span><br />
            in real-time
          </h1>
          <p className="welcome-subtitle">
            Not just a result — the entire process. Agents debate, code, argue, review,
            and polish your site while you watch every move.
          </p>
        </motion.div>

        {/* Agent strip */}
        <motion.div className="welcome-agents" variants={itemVariants}>
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.id}
              className="welcome-agent-card"
              style={{ '--agent-color': agent.color }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <span className="welcome-agent-emoji">{agent.emoji}</span>
              <div className="welcome-agent-info">
                <span className="welcome-agent-name" style={{ color: agent.color }}>{agent.name}</span>
                <span className="welcome-agent-role">{agent.role}</span>
                <span className="welcome-agent-desc">{agent.desc}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Features grid */}
        <motion.div className="welcome-features" variants={itemVariants}>
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              className="welcome-feature"
              whileHover={{ scale: 1.02 }}
            >
              <feature.icon size={18} className="welcome-feature-icon" />
              <div>
                <div className="welcome-feature-label">{feature.label}</div>
                <div className="welcome-feature-desc">{feature.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div className="welcome-cta" variants={itemVariants}>
          <motion.button
            className="btn btn-primary btn-lg welcome-btn-start"
            onClick={onStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Start Building
            <ArrowRight size={18} />
          </motion.button>
          <p className="welcome-cta-note">Free to try · No account required</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
