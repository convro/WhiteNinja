import { useEffect, useRef, useCallback, useState } from 'react'

const WS_URL = `ws://${window.location.host}/ws`

export function useBuilderSocket() {
  const wsRef = useRef(null)
  const handlersRef = useRef({})
  const reconnectTimeoutRef = useRef(null)
  const [connectionState, setConnectionState] = useState('disconnected') // connecting | connected | disconnected | error

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
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnectionState('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionState('connected')
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const handler = handlersRef.current[message.type]
        if (handler) handler(message)
        // Also call wildcard handler
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
      setConnectionState('disconnected')
      wsRef.current = null
      // Auto-reconnect after 3s
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null // Prevent auto-reconnect
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
