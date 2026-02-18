import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
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
  initial: { opacity: 0, y: 20, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -20, filter: 'blur(6px)' },
}

const pageTransition = {
  type: 'spring',
  stiffness: 260,
  damping: 25,
}

export default function App() {
  const [phase, setPhase] = useState(PHASES.WELCOME)
  const [brief, setBrief] = useState('')
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [buildResult, setBuildResult] = useState(null)
  const [configSuggestions, setConfigSuggestions] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [buildStartTime, setBuildStartTime] = useState(null)

  const goToPhase = useCallback((nextPhase) => {
    setPhase(nextPhase)
  }, [])

  const handleBriefSubmit = useCallback(async (briefText) => {
    setBrief(briefText)
    setIsAnalyzing(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const res = await fetch('/api/suggest-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: briefText }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const suggestions = await res.json()
      setConfigSuggestions(suggestions)

      if (suggestions.suggestedConfig) {
        setConfig(prev => ({ ...prev, ...suggestions.suggestedConfig }))
      }

      if (suggestions.error) {
        toast.warning('AI analysis partially failed — using defaults for some settings')
      }
    } catch (err) {
      console.error('Config suggestion failed:', err)
      setConfigSuggestions(null)
      if (err.name === 'AbortError') {
        toast.error('Analysis timed out — using default settings')
      } else {
        toast.error('Could not analyze brief — using default settings')
      }
    } finally {
      setIsAnalyzing(false)
      setPhase(PHASES.CONFIG)
    }
  }, [])

  const handleConfigSubmit = useCallback((cfg) => {
    setConfig(cfg)
    setBuildStartTime(Date.now())
    setPhase(PHASES.BUILDING)
  }, [])

  const handleBuildComplete = useCallback((result) => {
    const buildTime = buildStartTime ? Math.round((Date.now() - buildStartTime) / 1000) : null
    setBuildResult({ ...result, buildTime })
    setPhase(PHASES.REVIEW)
  }, [buildStartTime])

  const handleStartOver = useCallback(() => {
    setBrief('')
    setConfig(DEFAULT_CONFIG)
    setBuildResult(null)
    setConfigSuggestions(null)
    setIsAnalyzing(false)
    setBuildStartTime(null)
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
              isAnalyzing={isAnalyzing}
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
              suggestions={configSuggestions}
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
