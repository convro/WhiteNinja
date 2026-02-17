import { useEffect, useRef, useCallback, useState } from 'react'

const WS_URL = `ws://${window.location.host}/ws`

export function useBuilderSocket() {
  const wsRef = useRef(null)
  const handlersRef = useRef({})
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const [connectionState, setConnectionState] = useState('disconnected')

  const emit = useCallback((type, data = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    }
  }, [])

  const on = useCallback((type, handler) => {
    handlersRef.current[type] = handler
    return () => {
      delete handlersRef.current[type]
    }
  }, [])

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

    setConnectionState('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0
      setConnectionState('connected')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const handler = handlersRef.current[message.type]
        if (handler) handler(message)
        const wildcard = handlersRef.current['*']
        if (wildcard) wildcard(message)
      } catch (err) {
        console.error('[WS] Failed to parse message:', err)
      }
    }

    ws.onerror = () => {
      setConnectionState('error')
    }

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      setConnectionState('disconnected')
      // Exponential backoff: 2s, 4s, 8s, max 16s
      const attempts = reconnectAttemptsRef.current
      const delay = Math.min(2000 * Math.pow(2, attempts), 16000)
      reconnectAttemptsRef.current = attempts + 1
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [])

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null // prevent auto-reconnect
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionState('disconnected')
  }, [])

  // Actions
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
    connectionState,
    on,
    emit,
    startBuild,
    sendFeedback,
    resolveConflict,
    pauseBuild,
    resumeBuild,
    approvePhase,
  }
}
