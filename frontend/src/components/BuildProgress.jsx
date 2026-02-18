import { motion } from 'framer-motion'
import './BuildProgress.css'

const MILESTONES = [
  'PLANNING', 'SCAFFOLDING', 'CODING', 'REVIEWING', 'FIXING', 'TESTING', 'BUGFIXING', 'RETESTING', 'POLISHING', 'COMPLETE'
]

export default function BuildProgress({ percent = 0, phase, milestone }) {
  // Map phase to milestone index — RETESTING/BUGFIXING may repeat,
  // so find latest matching index or fall back to phase name
  let currentIdx = MILESTONES.indexOf(phase)
  if (currentIdx === -1) currentIdx = 0 // unknown phase, show at start

  return (
    <div className="build-progress">
      <div className="build-progress-bar">
        <div className="progress-bar">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 20 }}
          />
        </div>
        <span className="build-progress-pct">{percent}%</span>
      </div>

      <div className="build-progress-phases">
        {MILESTONES.map((m, i) => (
          <div
            key={m}
            className={`build-progress-phase ${
              i < currentIdx ? 'done' :
              i === currentIdx ? 'active' : ''
            }`}
            title={m}
          >
            <div className="build-progress-phase-dot" />
            <span className="build-progress-phase-label">{m}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
