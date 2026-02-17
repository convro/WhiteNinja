import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Rocket, Settings2, Sliders, Palette } from 'lucide-react'
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

export default function ConfigScreen({ brief, config: initialConfig, onSubmit, onBack }) {
  const [config, setConfig] = useState(initialConfig)

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))

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
          <p>Tune how the agents work. You can always change these mid-build.</p>
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
              {SITE_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`config-type-btn ${config.siteType === type.value ? 'active' : ''}`}
                  onClick={() => update('siteType', type.value)}
                >
                  <span>{type.emoji}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style Preset */}
          <div className="config-section">
            <div className="config-section-header">
              <Palette size={15} />
              <span>Style Preset</span>
            </div>
            <div className="config-presets">
              {STYLE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  className={`config-preset-btn ${config.stylePreset === preset.value ? 'active' : ''}`}
                  onClick={() => update('stylePreset', preset.value)}
                >
                  <div className="config-preset-colors">
                    {preset.preview.map((color, i) => (
                      <div key={i} className="config-preset-swatch" style={{ background: color }} />
                    ))}
                  </div>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

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
              {CODE_QUALITY.map(q => (
                <button
                  key={q.value}
                  className={`config-quality-btn ${config.codeQuality === q.value ? 'active' : ''}`}
                  onClick={() => update('codeQuality', q.value)}
                >
                  <div className="config-quality-label">{q.label}</div>
                  <div className="config-quality-desc">{q.desc}</div>
                </button>
              ))}
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
                    <span className="config-toggle-label">{toggle.label}</span>
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
          onClick={() => onSubmit(config)}
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
