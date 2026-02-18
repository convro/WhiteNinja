import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Rocket, Settings2, Sliders, Palette,
  Sparkles, Layout, Target, Users, Zap, Package,
  Globe, Star, Layers, Type, Monitor, Briefcase,
  PenTool, ShoppingCart, BarChart3, Wand2
} from 'lucide-react'
import AgentAvatar from '../components/AgentAvatar'
import './ConfigScreen.css'

const SITE_TYPES = [
  { value: 'landing', label: 'Landing Page', emoji: '🚀', icon: Rocket, iconColor: '#3b82f6' },
  { value: 'portfolio', label: 'Portfolio', emoji: '💼', icon: Briefcase, iconColor: '#a855f7' },
  { value: 'blog', label: 'Blog', emoji: '✍️', icon: PenTool, iconColor: '#22c55e' },
  { value: 'ecommerce', label: 'E-commerce', emoji: '🛒', icon: ShoppingCart, iconColor: '#eab308' },
  { value: 'dashboard', label: 'Dashboard', emoji: '📊', icon: BarChart3, iconColor: '#ef4444' },
  { value: 'custom', label: 'Custom', emoji: '✨', icon: Wand2, iconColor: '#60a5fa' },
]

const STYLE_PRESETS = [
  { value: 'modern-dark', label: 'Modern Dark', preview: ['#0a0a0f', '#3b82f6', '#edf2f7'] },
  { value: 'clean-minimal', label: 'Clean Minimal', preview: ['#ffffff', '#111827', '#6b7280'] },
  { value: 'bold-colorful', label: 'Bold & Colorful', preview: ['#1a1a2e', '#e94560', '#f5a623'] },
  { value: 'corporate', label: 'Corporate', preview: ['#f8fafc', '#1e40af', '#334155'] },
  { value: 'retro', label: 'Retro', preview: ['#1a1a1a', '#00ff41', '#ff6b6b'] },
]

const CODE_QUALITY = [
  { value: 'speed', label: 'Fast Build', desc: 'Ship quickly, fix later', icon: Zap },
  { value: 'balanced', label: 'Balanced', desc: 'Speed meets quality', icon: Sliders },
  { value: 'perfectionist', label: 'Perfectionist', desc: 'Every detail matters', icon: Star },
]

const ICON_MAP = {
  Palette, Layout, Target, Users, Zap, Package,
  Globe, Star, Layers, Type, Settings2,
}

const AGENTS = ['architect', 'frontend-dev', 'stylist', 'reviewer', 'qa-tester']

function AiBadge() {
  return <span className="config-ai-badge"><Sparkles size={9} /> AI</span>
}

function SiteTypeIcon({ icon: Icon, color, isActive }) {
  return (
    <div className={`config-type-icon-wrap ${isActive ? 'active' : ''}`} style={{ '--icon-color': color }}>
      <Icon size={20} strokeWidth={1.8} />
      <div className="config-type-icon-glow" />
    </div>
  )
}

function SliderTrack({ value, min = 0, max = 100 }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="config-slider-track-bg">
      <div
        className="config-slider-track-fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 30 },
  }),
}

export default function ConfigScreen({ brief, config: initialConfig, suggestions, onSubmit, onBack }) {
  const [config, setConfig] = useState(initialConfig)
  const [customAnswers, setCustomAnswers] = useState(() => {
    const defaults = {}
    suggestions?.customQuestions?.forEach(q => {
      defaults[q.configKey] = q.defaultValue ?? q.options[0]?.value
    })
    return defaults
  })

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))
  const updateCustom = (key, value) => setCustomAnswers(prev => ({ ...prev, [key]: value }))

  const isSuggested = (field, value) => suggestions?.suggestedConfig?.[field] === value

  const handleSubmit = () => {
    onSubmit({ ...config, ...customAnswers })
  }

  const questions = suggestions?.customQuestions || []
  const reasoning = suggestions?.reasoning

  let sectionIdx = 0

  return (
    <div className="config-screen">
      <div className="config-orb config-orb--purple" />
      <div className="config-orb config-orb--blue" />

      <motion.div
        className="config-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="config-header">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
          <div className="config-step">
            <span className="config-step-dot" />
            <span className="config-step-dot config-step-dot--active" />
            Step 2 of 2
          </div>
        </div>

        <motion.div
          className="config-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2>Configure the Build</h2>
          <p>
            {reasoning
              ? <><Sparkles size={12} className="config-title-sparkle" /> {reasoning}</>
              : 'Tune how the agents work. You can always change these mid-build.'}
          </p>
        </motion.div>

        {/* Brief summary */}
        <motion.div
          className="config-brief-preview"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="config-brief-label">Your brief</div>
          <div className="config-brief-text">{brief}</div>
        </motion.div>

        <div className="config-sections">

          {/* Site Type */}
          <motion.div
            className="config-section"
            custom={sectionIdx++}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="config-section-accent" style={{ '--accent-line': 'var(--accent)' }} />
            <div className="config-section-header">
              <Settings2 size={15} />
              <span>Site Type</span>
            </div>
            <div className="config-site-types">
              {SITE_TYPES.map(type => {
                const suggested = isSuggested('siteType', type.value)
                const isActive = config.siteType === type.value
                return (
                  <button
                    key={type.value}
                    className={`config-type-btn ${isActive ? 'active' : ''} ${suggested ? 'suggested' : ''}`}
                    onClick={() => update('siteType', type.value)}
                  >
                    <SiteTypeIcon icon={type.icon} color={type.iconColor} isActive={isActive} />
                    <span className="config-type-label">{type.label}</span>
                    {suggested && <AiBadge />}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Style Preset */}
          <motion.div
            className="config-section"
            custom={sectionIdx++}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="config-section-accent" style={{ '--accent-line': 'var(--purple)' }} />
            <div className="config-section-header">
              <Palette size={15} />
              <span>Style Preset</span>
            </div>
            <div className="config-presets">
              {STYLE_PRESETS.map(preset => {
                const suggested = isSuggested('stylePreset', preset.value)
                const colors = (suggested && suggestions?.suggestedConfig?.primaryColor)
                  ? [suggestions.suggestedConfig.primaryColor, ...preset.preview.slice(1)]
                  : preset.preview
                const isActive = config.stylePreset === preset.value
                return (
                  <button
                    key={preset.value}
                    className={`config-preset-btn ${isActive ? 'active' : ''} ${suggested ? 'suggested' : ''}`}
                    onClick={() => update('stylePreset', preset.value)}
                  >
                    <div className="config-preset-colors">
                      {colors.map((color, i) => (
                        <div key={i} className="config-preset-swatch" style={{ '--swatch-color': color }}>
                          <div className="config-preset-swatch-shimmer" />
                        </div>
                      ))}
                    </div>
                    <span>{preset.label}</span>
                    {suggested && <AiBadge />}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Custom AI Questions */}
          {questions.length > 0 && (
            <motion.div
              className="config-section config-section--ai"
              custom={sectionIdx++}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
            >
              <div className="config-section-accent" style={{ '--accent-line': 'var(--accent)' }} />
              <div className="config-ai-glow-border" />
              <div className="config-section-header">
                <Sparkles size={15} />
                <span>Tailored for your project</span>
                <span className="config-ai-tag">AI generated</span>
              </div>
              <div className="config-custom-questions">
                {questions.map((q, qi) => {
                  const IconComp = ICON_MAP[q.icon] || Target
                  return (
                    <motion.div
                      key={q.id}
                      className="config-custom-question"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + qi * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <div className="config-custom-question-header">
                        <IconComp size={13} />
                        <span className="config-custom-question-label">{q.label}</span>
                      </div>
                      {q.description && (
                        <div className="config-custom-question-desc">{q.description}</div>
                      )}
                      <div className="config-custom-opts">
                        {q.options.map(opt => (
                          <button
                            key={opt.value}
                            className={`config-custom-opt ${customAnswers[q.configKey] === opt.value ? 'active' : ''}`}
                            onClick={() => updateCustom(q.configKey, opt.value)}
                          >
                            <span className="config-custom-opt-emoji">{opt.emoji}</span>
                            <div className="config-custom-opt-info">
                              <span className="config-custom-opt-label">{opt.label}</span>
                              {opt.desc && <span className="config-custom-opt-desc">{opt.desc}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Agent Behavior */}
          <motion.div
            className="config-section"
            custom={sectionIdx++}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="config-section-accent" style={{ '--accent-line': 'var(--frontend-dev)' }} />
            <div className="config-section-header">
              <Sliders size={15} />
              <span>Agent Behavior</span>
            </div>

            <div className="config-sliders">
              <div className="config-slider-wrap">
                <div className="config-slider-label">
                  <span>Agent Verbosity</span>
                  <span className="config-slider-val">{config.agentVerbosity}%</span>
                </div>
                <div className="config-slider-desc">How much agents discuss vs silently code</div>
                <div className="config-slider-container">
                  <SliderTrack value={config.agentVerbosity} />
                  <input
                    type="range" min="0" max="100" step="10"
                    value={config.agentVerbosity}
                    onChange={e => update('agentVerbosity', Number(e.target.value))}
                    className="config-range"
                    style={{ '--slider-pct': `${config.agentVerbosity}%` }}
                  />
                </div>
                <div className="config-slider-hints">
                  <span>Silent builders</span>
                  <span>Maximum drama</span>
                </div>
              </div>

              <div className="config-slider-wrap">
                <div className="config-slider-label">
                  <span>Agent Conflicts</span>
                  <span className="config-slider-val">{config.conflictFrequency}%</span>
                </div>
                <div className="config-slider-desc">How often agents disagree and argue</div>
                <div className="config-slider-container">
                  <SliderTrack value={config.conflictFrequency} />
                  <input
                    type="range" min="0" max="100" step="10"
                    value={config.conflictFrequency}
                    onChange={e => update('conflictFrequency', Number(e.target.value))}
                    className="config-range"
                    style={{ '--slider-pct': `${config.conflictFrequency}%` }}
                  />
                </div>
                <div className="config-slider-hints">
                  <span>Always agree</span>
                  <span>Constant chaos</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Code Quality */}
          <motion.div
            className="config-section"
            custom={sectionIdx++}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="config-section-accent" style={{ '--accent-line': 'var(--warning)' }} />
            <div className="config-section-header">
              <Settings2 size={15} />
              <span>Code Quality Mode</span>
            </div>
            <div className="config-quality-opts">
              {CODE_QUALITY.map(q => {
                const suggested = isSuggested('codeQuality', q.value)
                const isActive = config.codeQuality === q.value
                const QIcon = q.icon
                return (
                  <button
                    key={q.value}
                    className={`config-quality-btn ${isActive ? 'active' : ''} ${suggested ? 'suggested' : ''}`}
                    onClick={() => update('codeQuality', q.value)}
                  >
                    <div className="config-quality-icon">
                      <QIcon size={16} />
                    </div>
                    <div className="config-quality-label">
                      {q.label}
                      {suggested && <AiBadge />}
                    </div>
                    <div className="config-quality-desc">{q.desc}</div>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Toggles */}
          <motion.div
            className="config-section"
            custom={sectionIdx++}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="config-section-accent" style={{ '--accent-line': 'var(--stylist)' }} />
            <div className="config-section-header">
              <Settings2 size={15} />
              <span>Build Options</span>
            </div>
            <div className="config-toggles">
              {[
                { key: 'responsive', label: 'Responsive Design', desc: 'Mobile-first, works on all screens' },
                { key: 'animations', label: 'Animations', desc: 'CSS transitions & hover effects' },
                { key: 'darkMode', label: 'Dark Mode Site', desc: 'Build a dark-themed website' },
                { key: 'includeImages', label: 'Placeholder Images', desc: 'Include placeholder image blocks' },
              ].map(toggle => (
                <label key={toggle.key} className="config-toggle">
                  <div className="config-toggle-info">
                    <span className="config-toggle-label">
                      {toggle.label}
                      {isSuggested(toggle.key, true) && config[toggle.key] && <AiBadge />}
                    </span>
                    <span className="config-toggle-desc">{toggle.desc}</span>
                  </div>
                  <div
                    className={`config-toggle-switch ${config[toggle.key] ? 'on' : ''}`}
                    onClick={() => update(toggle.key, !config[toggle.key])}
                  >
                    <div className="config-toggle-thumb" />
                  </div>
                </label>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Agent Team Ready Row */}
        <motion.div
          className="config-agent-row"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="config-agent-row-avatars">
            {AGENTS.map((agentId, i) => (
              <motion.div
                key={agentId}
                className="config-agent-row-item"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + i * 0.06, type: 'spring', stiffness: 400, damping: 20 }}
              >
                <AgentAvatar agentId={agentId} size="sm" />
                <span className="config-agent-status-dot" />
              </motion.div>
            ))}
          </div>
          <span className="config-agent-row-label">Team ready to build</span>
        </motion.div>

        {/* Submit */}
        <motion.button
          className="btn btn-primary config-submit"
          onClick={handleSubmit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="config-submit-rocket">
            <Rocket size={16} />
          </span>
          <span>Launch Build</span>
          <span className="config-submit-glow" />
        </motion.button>
      </motion.div>
    </div>
  )
}
