import { useEffect, useRef, useCallback, useState } from 'react'

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws'
const WS_URL = `${WS_PROTOCOL}://${window.location.host}/ws`

const MAX_RETRY_ATTEMPTS = 10
const PING_INTERVAL_MS = 15000
const PING_TIMEOUT_MS = 5000

/**
 * Categorize errors into actionable types.
 */
function categorizeError(error, context) {
  if (context === 'parse') {
    return { category: 'parse_error', message: 'Failed to parse server message', recoverable: true }
  }
  if (context === 'close') {
    const code = error?.code
    if (code >= 4000 && code < 5000) {
      return { category: 'server_error', message: `Server rejected connection (${code})`, recoverable: code !== 4001 }
    }
    if (code === 1006 || code === 1001) {
      return { category: 'network_error', message: 'Connection lost unexpectedly', recoverable: true }
    }
    return { category: 'network_error', message: 'Connection closed', recoverable: true }
  }
  return { category: 'network_error', message: error?.message || 'Unknown error', recoverable: true }
}

export function useBuilderSocket() {
  const wsRef = useRef(null)
  const handlersRef = useRef({})
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const pingIntervalRef = useRef(null)
  const pingStartRef = useRef(null)
  const messageQueueRef = useRef([])
  const retriesExhaustedRef = useRef(false)

  const [connectionState, setConnectionState] = useState('disconnected')
  const [latencyMs, setLatencyMs] = useState(null)
  const [connectionQuality, setConnectionQuality] = useState('unknown') // 'excellent' | 'good' | 'poor' | 'unknown'
  const [lastError, setLastError] = useState(null)
  const [stats, setStats] = useState({ sent: 0, received: 0 })

  // Optional callback ref for connection change events
  const onConnectionChangeRef = useRef(null)

  const setOnConnectionChange = useCallback((cb) => {
    onConnectionChangeRef.current = cb
  }, [])

  // Internal helper to update connection state AND fire callback
  const updateConnectionState = useCallback((state, extra = {}) => {
    setConnectionState(state)
    if (onConnectionChangeRef.current) {
      onConnectionChangeRef.current({ state, ...extra })
    }
  }, [])

  // Derive quality from latency
  const updateLatency = useCallback((ms) => {
    setLatencyMs(ms)
    if (ms === null) {
      setConnectionQuality('unknown')
    } else if (ms < 80) {
      setConnectionQuality('excellent')
    } else if (ms < 200) {
      setConnectionQuality('good')
    } else {
      setConnectionQuality('poor')
    }
  }, [])

  // Flush queued messages when we reconnect
  const flushMessageQueue = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const queue = [...messageQueueRef.current]
    messageQueueRef.current = []
    for (const raw of queue) {
      try {
        wsRef.current.send(raw)
        setStats(prev => ({ ...prev, sent: prev.sent + 1 }))
      } catch {
        // Re-queue on failure
        messageQueueRef.current.push(raw)
        break
      }
    }
  }, [])

  const emit = useCallback((type, data = {}) => {
    const raw = JSON.stringify({ type, ...data })
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(raw)
      setStats(prev => ({ ...prev, sent: prev.sent + 1 }))
    } else {
      // Buffer while disconnected
      messageQueueRef.current.push(raw)
    }
  }, [])

  const on = useCallback((type, handler) => {
    handlersRef.current[type] = handler
    return () => {
      delete handlersRef.current[type]
    }
  }, [])

  // Ping measurement
  const startPinging = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        pingStartRef.current = performance.now()
        try {
          wsRef.current.send(JSON.stringify({ type: '__ping' }))
        } catch {
          // Ignore send errors during ping
        }
      }
    }, PING_INTERVAL_MS)
  }, [])

  const stopPinging = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    pingStartRef.current = null
    updateLatency(null)
  }, [updateLatency])

  const connect = useCallback(() => {
    // Don't reconnect if already open OR still connecting
    if (wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
       wsRef.current.readyState === WebSocket.CONNECTING)) return

    // Clear any pending reconnect timer
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Check max retries
    if (reconnectAttemptsRef.current >= MAX_RETRY_ATTEMPTS) {
      if (!retriesExhaustedRef.current) {
        retriesExhaustedRef.current = true
        const err = { category: 'network_error', message: `Failed to connect after ${MAX_RETRY_ATTEMPTS} attempts`, recoverable: false }
        setLastError(err)
        updateConnectionState('failed', { error: err })
      }
      return
    }

    updateConnectionState('connecting')
    setLastError(null)

    let ws
    try {
      ws = new WebSocket(WS_URL)
    } catch (err) {
      const categorized = categorizeError(err, 'create')
      setLastError(categorized)
      updateConnectionState('error', { error: categorized })
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0
      retriesExhaustedRef.current = false
      updateConnectionState('connected')
      startPinging()
      // Flush any queued messages
      flushMessageQueue()
    }

    ws.onmessage = (event) => {
      setStats(prev => ({ ...prev, received: prev.received + 1 }))
      try {
        const message = JSON.parse(event.data)

        // Handle pong for latency measurement
        if (message.type === '__pong') {
          if (pingStartRef.current !== null) {
            const elapsed = performance.now() - pingStartRef.current
            updateLatency(Math.round(elapsed))
            pingStartRef.current = null
          }
          return
        }

        const handler = handlersRef.current[message.type]
        if (handler) handler(message)
        const wildcard = handlersRef.current['*']
        if (wildcard) wildcard(message)
      } catch (err) {
        const categorized = categorizeError(err, 'parse')
        setLastError(categorized)
        console.error('[WS] Failed to parse message:', err)
      }
    }

    ws.onerror = () => {
      const categorized = categorizeError(null, 'error')
      setLastError(categorized)
      updateConnectionState('error', { error: categorized })
    }

    ws.onclose = (event) => {
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      stopPinging()

      const categorized = categorizeError(event, 'close')
      setLastError(categorized)

      if (!categorized.recoverable) {
        updateConnectionState('failed', { error: categorized })
        return
      }

      updateConnectionState('disconnected', { error: categorized })

      // Exponential backoff: 2s, 4s, 8s, max 16s
      const attempts = reconnectAttemptsRef.current
      const delay = Math.min(2000 * Math.pow(2, attempts), 16000)
      reconnectAttemptsRef.current = attempts + 1
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [updateConnectionState, startPinging, stopPinging, flushMessageQueue, updateLatency])

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    retriesExhaustedRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    stopPinging()
    if (wsRef.current) {
      wsRef.current.onclose = null // prevent auto-reconnect
      wsRef.current.close()
      wsRef.current = null
    }
    messageQueueRef.current = []
    updateConnectionState('disconnected')
  }, [stopPinging, updateConnectionState])

  // Manual retry when retries exhausted
  const retryConnection = useCallback(() => {
    reconnectAttemptsRef.current = 0
    retriesExhaustedRef.current = false
    setLastError(null)
    connect()
  }, [connect])

  // Actions (unchanged external API)
  const startBuild = useCallback((brief, config) => {
    emit('start_build', { brief, config })
  }, [emit])

  const sendFeedback = useCallback((message) => {
    emit('user_feedback', { message })
  }, [emit])

  const resolveConflict = useCallback((conflictId, choice, customSolution = '') => {
    emit('resolve_conflict', { conflictId, choice, customSolution })
  }, [emit])

  const pauseBuild = useCallback(() => {
    emit('pause_build')
  }, [emit])

  const resumeBuild = useCallback(() => {
    emit('resume_build')
  }, [emit])

  const approvePhase = useCallback(() => {
    emit('approve_phase')
  }, [emit])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    // Existing API
    connectionState,
    on,
    emit,
    startBuild,
    sendFeedback,
    resolveConflict,
    pauseBuild,
    resumeBuild,
    approvePhase,

    // New capabilities
    latencyMs,
    connectionQuality,
    lastError,
    stats,
    retryConnection,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxRetries: MAX_RETRY_ATTEMPTS,
    queuedMessageCount: messageQueueRef.current.length,
    setOnConnectionChange,
  }
}
