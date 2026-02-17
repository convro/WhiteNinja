import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Lightbulb, Sparkles } from 'lucide-react'
import './BriefScreen.css'

const EXAMPLES = [
  "A dark-themed portfolio for a full-stack developer with a hero section, project cards, skills grid, and contact form",
  "A modern SaaS landing page for a project management tool with pricing table, feature highlights, and testimonials",
  "An e-commerce product page for handmade pottery with a gallery, product details, reviews, and add-to-cart flow",
  "A minimalist blog homepage with featured posts, categories sidebar, and newsletter signup",
  "A restaurant website with hero image, menu sections, gallery, booking form, and location map",
]

export default function BriefScreen({ onSubmit, onBack }) {
  const [brief, setBrief] = useState('')
  const [charCount, setCharCount] = useState(0)

  const handleChange = (e) => {
    setBrief(e.target.value)
    setCharCount(e.target.value.length)
  }

  const handleExampleClick = (example) => {
    setBrief(example)
    setCharCount(example.length)
  }

  const canSubmit = brief.trim().length >= 20

  return (
    <div className="brief-screen">
      <div className="brief-orb brief-orb--accent" />

      <motion.div
        className="brief-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="brief-header">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
          <div className="brief-step">Step 1 of 2</div>
        </div>

        {/* Title */}
        <div className="brief-title">
          <h2>Describe your website</h2>
          <p>Tell the agents what you want to build. Be as specific or as vague as you like — they'll figure it out.</p>
        </div>

        {/* Textarea */}
        <div className="brief-input-wrap">
          <textarea
            className="input brief-textarea"
            placeholder="E.g. A dark portfolio site for a motion designer with a fullscreen hero, project gallery with hover effects, about section, and a minimal contact form..."
            value={brief}
            onChange={handleChange}
            autoFocus
            rows={6}
          />
          <div className="brief-char-count" style={{ color: charCount > 800 ? 'var(--warning)' : '' }}>
            {charCount} / 1000
          </div>
        </div>

        {/* Examples */}
        <div className="brief-examples">
          <div className="brief-examples-label">
            <Lightbulb size={13} />
            <span>Need inspiration? Try one of these:</span>
          </div>
          <div className="brief-examples-list">
            {EXAMPLES.map((example, i) => (
              <motion.button
                key={i}
                className="brief-example-btn"
                onClick={() => handleExampleClick(example)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Sparkles size={12} />
                {example}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="brief-footer">
          {!canSubmit && brief.length > 0 && (
            <p className="brief-hint">Add a bit more detail ({20 - brief.trim().length} more characters)</p>
          )}
          <motion.button
            className="btn btn-primary brief-submit"
            onClick={() => onSubmit(brief.trim())}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
          >
            Configure Agents
            <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
