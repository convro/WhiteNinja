import { useState, useCallback, useMemo, useRef } from 'react'

const MAX_HISTORY_PER_FILE = 30

/**
 * Calculate byte size of a string (UTF-8 approximation).
 */
function byteSize(str) {
  if (!str) return 0
  return new Blob([str]).size
}

/**
 * Count lines of code in a string (non-empty lines).
 */
function countLines(str) {
  if (!str) return 0
  return str.split('\n').filter(l => l.trim().length > 0).length
}

export function useFileSystem() {
  const [files, setFiles] = useState(new Map()) // path -> { content, agentId, createdAt, modifiedAt, isNew, sizeBytes }
  const [selectedFile, setSelectedFile] = useState(null)

  // History: path -> [{ content, agentId, timestamp }]
  const historyRef = useRef(new Map())

  // Agent contribution stats: agentId -> { filesCreated: Set, filesModified: Map<path, count>, totalEdits: number }
  const [agentStats, setAgentStats] = useState({})

  // Push a snapshot to the undo history for a given path
  const pushHistory = useCallback((path, content, agentId) => {
    const history = historyRef.current
    if (!history.has(path)) {
      history.set(path, [])
    }
    const stack = history.get(path)
    stack.push({ content, agentId, timestamp: Date.now() })
    // Trim to max size
    if (stack.length > MAX_HISTORY_PER_FILE) {
      stack.splice(0, stack.length - MAX_HISTORY_PER_FILE)
    }
  }, [])

  // Update agent contribution stats
  const trackAgentContribution = useCallback((agentId, path, action) => {
    if (!agentId) return
    setAgentStats(prev => {
      const next = { ...prev }
      if (!next[agentId]) {
        next[agentId] = { filesCreated: [], filesModified: {}, totalEdits: 0 }
      }
      const agent = { ...next[agentId] }
      if (action === 'create') {
        agent.filesCreated = [...new Set([...agent.filesCreated, path])]
      }
      agent.filesModified = { ...agent.filesModified }
      agent.filesModified[path] = (agent.filesModified[path] || 0) + 1
      agent.totalEdits = agent.totalEdits + 1
      next[agentId] = agent
      return next
    })
  }, [])

  const createFile = useCallback((path, content, agentId) => {
    const size = byteSize(content)
    setFiles(prev => {
      const next = new Map(prev)
      next.set(path, {
        content,
        agentId,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        isNew: true,
        sizeBytes: size,
      })
      return next
    })
    pushHistory(path, content, agentId)
    trackAgentContribution(agentId, path, 'create')
  }, [pushHistory, trackAgentContribution])

  const modifyFile = useCallback((path, content, agentId, diff) => {
    const size = byteSize(content)
    setFiles(prev => {
      const next = new Map(prev)
      const existing = next.get(path)
      // Save current content to history before overwriting
      if (existing) {
        pushHistory(path, existing.content, existing.agentId)
      }
      next.set(path, {
        ...(existing || {}),
        content,
        agentId,
        modifiedAt: Date.now(),
        diff,
        isNew: false,
        sizeBytes: size,
      })
      return next
    })
    trackAgentContribution(agentId, path, 'modify')
  }, [pushHistory, trackAgentContribution])

  const deleteFile = useCallback((path) => {
    setFiles(prev => {
      const next = new Map(prev)
      // Save final snapshot before deletion
      const existing = next.get(path)
      if (existing) {
        pushHistory(path, existing.content, existing.agentId)
      }
      next.delete(path)
      return next
    })
    setSelectedFile(prev => prev === path ? null : prev)
  }, [pushHistory])

  const clearFiles = useCallback(() => {
    setFiles(new Map())
    setSelectedFile(null)
    historyRef.current = new Map()
    setAgentStats({})
  }, [])

  // Undo last change to a specific file
  const undoFile = useCallback((path) => {
    const history = historyRef.current
    const stack = history.get(path)
    if (!stack || stack.length === 0) return false

    const snapshot = stack.pop()
    setFiles(prev => {
      const next = new Map(prev)
      const existing = next.get(path)
      if (existing) {
        next.set(path, {
          ...existing,
          content: snapshot.content,
          agentId: snapshot.agentId,
          modifiedAt: Date.now(),
          sizeBytes: byteSize(snapshot.content),
        })
      } else {
        // File was deleted, restore it
        next.set(path, {
          content: snapshot.content,
          agentId: snapshot.agentId,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          isNew: false,
          sizeBytes: byteSize(snapshot.content),
        })
      }
      return next
    })
    return true
  }, [])

  // Check if undo is available for a file
  const canUndo = useCallback((path) => {
    const stack = historyRef.current.get(path)
    return !!(stack && stack.length > 0)
  }, [])

  // Build a tree structure from flat file paths (memoized)
  const getTree = useMemo(() => {
    const tree = {}
    for (const [path, fileData] of files) {
      const parts = path.split('/')
      let node = tree
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node[parts[i]]) node[parts[i]] = { _dir: true, _children: {} }
        node = node[parts[i]]._children
      }
      const filename = parts[parts.length - 1]
      node[filename] = {
        _file: true,
        _path: path,
        _size: fileData.sizeBytes || 0,
        _agent: fileData.agentId,
      }
    }
    return tree
  }, [files])

  // Total file size across all files
  const totalSizeBytes = useMemo(() => {
    let total = 0
    for (const [, fileData] of files) {
      total += fileData.sizeBytes || 0
    }
    return total
  }, [files])

  // Total lines of code across all files
  const totalLinesOfCode = useMemo(() => {
    let total = 0
    for (const [, fileData] of files) {
      total += countLines(fileData.content)
    }
    return total
  }, [files])

  // File count
  const fileCount = useMemo(() => files.size, [files])

  return {
    // Existing API
    files,
    selectedFile,
    setSelectedFile,
    createFile,
    modifyFile,
    deleteFile,
    clearFiles,
    getTree,

    // New capabilities
    undoFile,
    canUndo,
    totalSizeBytes,
    totalLinesOfCode,
    fileCount,
    agentStats,
  }
}
