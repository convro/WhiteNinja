import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Rocket, Settings2, Sliders, Palette,
  Sparkles, Layout, Target, Users, Zap, Package,
  Globe, Star, Layers, Type
} from 'lucide-react'
import './ConfigScreen.css'

const SITE_TYPES = [
  { value: 'landing', label: 'Landing Page', emoji: '🚀' },
  { value: 'portfolio', label: 'Portfolio', emoji: '💼' },
  { value: 'blog', label: 'Blog', emoji: '✍️' },
  { value: 'ecommerce', label: 'E-commerce', emoji: '🛒' },
  { value: 'dashboard', label: 'Dashboard', emoji: '📊' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
]

const STYLE_PRESETS = [
  { value: 'modern-dark', label: 'Modern Dark', preview: ['#0a0a0f', '#3b82f6', '#edf2f7'] },
  { value: 'clean-minimal', label: 'Clean Minimal', preview: ['#ffffff', '#111827', '#6b7280'] },
  { value: 'bold-colorful', label: 'Bold & Colorful', preview: ['#1a1a2e', '#e94560', '#f5a623'] },
  { value: 'corporate', label: 'Corporate', preview: ['#f8fafc', '#1e40af', '#334155'] },
  { value: 'retro', label: 'Retro', preview: ['#1a1a1a', '#00ff41', '#ff6b6b'] },
]

const CODE_QUALITY = [
  { value: 'speed', label: 'Fast Build', desc: 'Ship quickly, fix later' },
  { value: 'balanced', label: 'Balanced', desc: 'Speed meets quality' },
  { value: 'perfectionist', label: 'Perfectionist', desc: 'Every detail matters' },
]

const ICON_MAP = {
  Palette, Layout, Target, Users, Zap, Package,
  Globe, Star, Layers, Type, Settings2,
}

function AiBadge() {
  return <span className="config-ai-badge"><Sparkles size={9} /> AI</span>
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

  return (
    <div className="config-screen">
      <div className="config-orb config-orb--purple" />

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
          <div className="config-step">Step 2 of 2</div>
        </div>

        <div className="config-title">
          <h2>Configure the Build</h2>
          <p>
            {reasoning
              ? <><Sparkles size={12} className="config-title-sparkle" /> {reasoning}</>
              : 'Tune how the agents work. You can always change these mid-build.'}
          </p>
        </div>

        {/* Brief summary */}
        <div className="config-brief-preview">
          <div className="config-brief-label">Your brief</div>
          <div className="config-brief-text">{brief}</div>
        </div>

        <div className="config-sections">

          {/* Site Type */}
          <div className="config-section">
            <div className="config-section-header">
              <Settings2 size={15} />
              <span>Site Type</span>
            </div>
            <div className="config-site-types">
              {SITE_TYPES.map(type => {
                const suggested = isSuggested('siteType', type.value)
                return (
                  <button
                    key={type.value}
                    className={`config-type-btn ${config.siteType === type.value ? 'active' : ''} ${suggested ? 'suggested' : ''}`}
                    onClick={() => update('siteType', type.value)}
                  >
                    <span>{type.emoji}</span>
                    <span>{type.label}</span>
                    {suggested && <AiBadge />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Style Preset */}
          <div className="config-section">
            <div className="config-section-header">
              <Palette size={15} />
              <span>Style Preset</span>
            </div>
            <div className="config-presets">
              {STYLE_PRESETS.map(preset => {
                const suggested = isSuggested('stylePreset', preset.value)
                // Override the first swatch color with suggested primary color if this preset is suggested
                const colors = (suggested && suggestions?.suggestedConfig?.primaryColor)
                  ? [suggestions.suggestedConfig.primaryColor, ...preset.preview.slice(1)]
                  : preset.preview
                return (
                  <button
                    key={preset.value}
                    className={`config-preset-btn ${config.stylePreset === preset.value ? 'active' : ''} ${suggested ? 'suggested' : ''}`}
                    onClick={() => update('stylePreset', preset.value)}
                  >
                    <div className="config-preset-colors">
                      {colors.map((color, i) => (
                        <div key={i} className="config-preset-swatch" style={{ background: color }} />
                      ))}
                    </div>
                    <span>{preset.label}</span>
                    {suggested && <AiBadge />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom AI Questions */}
          {questions.length > 0 && (
            <div className="config-section config-section--ai">
              <div className="config-section-header">
                <Sparkles size={15} />
                <span>Tailored for your project</span>
                <span className="config-ai-tag">AI generated</span>
              </div>
              <div className="config-custom-questions">
                {questions.map(q => {
                  const IconComp = ICON_MAP[q.icon] || Target
                  return (
                    <div key={q.id} className="config-custom-question">
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Agent Behavior */}
          <div className="config-section">
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
                <input
                  type="range" min="0" max="100" step="10"
                  value={config.agentVerbosity}
                  onChange={e => update('agentVerbosity', Number(e.target.value))}
                  className="config-range"
                />
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
                <input
                  type="range" min="0" max="100" step="10"
                  value={config.conflictFrequency}
                  onChange={e => update('conflictFrequency', Number(e.target.value))}
                  className="config-range"
                />
                <div className="config-slider-hints">
                  <span>Always agree</span>
                  <span>Constant chaos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Code Quality */}
          <div className="config-section">
            <div className="config-section-header">
              <Settings2 size={15} />
              <span>Code Quality Mode</span>
            </div>
            <div className="config-quality-opts">
              {CODE_QUALITY.map(q => {
                const suggested = isSuggested('codeQuality', q.value)
                return (
                  <button
                    key={q.value}
                    className={`config-quality-btn ${config.codeQuality === q.value ? 'active' : ''} ${suggested ? 'suggested' : ''}`}
                    onClick={() => update('codeQuality', q.value)}
                  >
                    <div className="config-quality-label">
                      {q.label}
                      {suggested && <AiBadge />}
                    </div>
                    <div className="config-quality-desc">{q.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="config-section">
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
          </div>
        </div>

        {/* Submit */}
        <motion.button
          className="btn btn-primary config-submit"
          onClick={handleSubmit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Rocket size={16} />
          Launch Build
        </motion.button>
      </motion.div>
    </div>
  )
}
