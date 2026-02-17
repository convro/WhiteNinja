import { useState, useCallback } from 'react'

export function useFileSystem() {
  const [files, setFiles] = useState(new Map()) // path -> { content, author, agentId, modifiedAt }
  const [selectedFile, setSelectedFile] = useState(null)

  const createFile = useCallback((path, content, agentId) => {
    setFiles(prev => {
      const next = new Map(prev)
      next.set(path, { content, agentId, createdAt: Date.now(), modifiedAt: Date.now(), isNew: true })
      return next
    })
  }, [])

  const modifyFile = useCallback((path, content, agentId, diff) => {
    setFiles(prev => {
      const next = new Map(prev)
      const existing = next.get(path)
      next.set(path, {
        ...(existing || {}),
        content,
        agentId,
        modifiedAt: Date.now(),
        diff,
        isNew: false,
      })
      return next
    })
  }, [])

  const deleteFile = useCallback((path) => {
    setFiles(prev => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
    setSelectedFile(prev => prev === path ? null : prev)
  }, [])

  const clearFiles = useCallback(() => {
    setFiles(new Map())
    setSelectedFile(null)
  }, [])

  // Build a tree structure from flat file paths
  const getTree = useCallback(() => {
    const tree = {}
    for (const [path] of files) {
      const parts = path.split('/')
      let node = tree
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node[parts[i]]) node[parts[i]] = { _dir: true, _children: {} }
        node = node[parts[i]]._children
      }
      const filename = parts[parts.length - 1]
      node[filename] = { _file: true, _path: path }
    }
    return tree
  }, [files])

  return {
    files,
    selectedFile,
    setSelectedFile,
    createFile,
    modifyFile,
    deleteFile,
    clearFiles,
    getTree,
  }
}
