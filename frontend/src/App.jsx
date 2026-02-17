import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import BriefScreen from './screens/BriefScreen.jsx'
import ConfigScreen from './screens/ConfigScreen.jsx'
import BuildScreen from './screens/BuildScreen.jsx'
import ReviewScreen from './screens/ReviewScreen.jsx'

const PHASES = {
  WELCOME: 'WELCOME',
  BRIEF: 'BRIEF',
  CONFIG: 'CONFIG',
  BUILDING: 'BUILDING',
  REVIEW: 'REVIEW',
}

const DEFAULT_CONFIG = {
  siteType: 'landing',
  stylePreset: 'modern-dark',
  primaryColor: '#3b82f6',
  fontPreference: 'sans-serif',
  agentVerbosity: 70,
  conflictFrequency: 50,
  codeQuality: 'balanced',
  responsive: true,
  animations: true,
  darkMode: false,
  framework: 'vanilla',
  includeImages: true,
  maxBuildTime: 300,
  language: 'en',
}

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -20, filter: 'blur(4px)' },
}

const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

export default function App() {
  const [phase, setPhase] = useState(PHASES.WELCOME)
  const [brief, setBrief] = useState('')
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [buildResult, setBuildResult] = useState(null)

  const goToPhase = useCallback((nextPhase) => {
    setPhase(nextPhase)
  }, [])

  const handleBriefSubmit = useCallback((briefText) => {
    setBrief(briefText)
    setPhase(PHASES.CONFIG)
  }, [])

  const handleConfigSubmit = useCallback((cfg) => {
    setConfig(cfg)
    setPhase(PHASES.BUILDING)
  }, [])

  const handleBuildComplete = useCallback((result) => {
    setBuildResult(result)
    setPhase(PHASES.REVIEW)
  }, [])

  const handleStartOver = useCallback(() => {
    setBrief('')
    setConfig(DEFAULT_CONFIG)
    setBuildResult(null)
    setPhase(PHASES.WELCOME)
  }, [])

  return (
    <div className="app">
      <div className="noise-overlay" />

      <AnimatePresence mode="wait">
        {phase === PHASES.WELCOME && (
          <motion.div
            key="welcome"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ height: '100%' }}
          >
            <WelcomeScreen onStart={() => goToPhase(PHASES.BRIEF)} />
          </motion.div>
        )}

        {phase === PHASES.BRIEF && (
          <motion.div
            key="brief"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ height: '100%' }}
          >
            <BriefScreen
              onSubmit={handleBriefSubmit}
              onBack={() => goToPhase(PHASES.WELCOME)}
            />
          </motion.div>
        )}

        {phase === PHASES.CONFIG && (
          <motion.div
            key="config"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ height: '100%' }}
          >
            <ConfigScreen
              brief={brief}
              config={config}
              onSubmit={handleConfigSubmit}
              onBack={() => goToPhase(PHASES.BRIEF)}
            />
          </motion.div>
        )}

        {phase === PHASES.BUILDING && (
          <motion.div
            key="building"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ height: '100%' }}
          >
            <BuildScreen
              brief={brief}
              config={config}
              onComplete={handleBuildComplete}
              onStartOver={handleStartOver}
            />
          </motion.div>
        )}

        {phase === PHASES.REVIEW && (
          <motion.div
            key="review"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ height: '100%' }}
          >
            <ReviewScreen
              result={buildResult}
              brief={brief}
              onStartOver={handleStartOver}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
