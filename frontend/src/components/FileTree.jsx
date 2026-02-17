import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { File, Folder, FolderOpen, ChevronRight } from 'lucide-react'
import { getAgentMeta } from './AgentAvatar.jsx'
import './FileTree.css'

function getFileIcon(name) {
  if (name.endsWith('.html')) return '📄'
  if (name.endsWith('.css')) return '🎨'
  if (name.endsWith('.js') || name.endsWith('.jsx')) return '⚡'
  if (name.endsWith('.json')) return '📦'
  if (name.endsWith('.md')) return '📝'
  if (name.endsWith('.svg')) return '🖼️'
  return '📄'
}

function TreeNode({ name, node, depth = 0, files, selectedFile, onSelectFile }) {
  const [expanded, setExpanded] = useState(true)

  if (node._file) {
    const fileData = files.get(node._path)
    const agentMeta = fileData ? getAgentMeta(fileData.agentId) : null
    const isSelected = selectedFile === node._path
    const isNew = fileData?.isNew

    return (
      <motion.button
        className={`file-tree-item file-tree-file ${isSelected ? 'active' : ''} ${isNew ? 'file-tree-file--new' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px`, '--agent-color': agentMeta?.color }}
        onClick={() => onSelectFile(node._path)}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <span className="file-tree-file-icon">{getFileIcon(name)}</span>
        <span className="file-tree-file-name">{name}</span>
        {agentMeta && (
          <span className="file-tree-file-agent" style={{ color: agentMeta.color }} title={agentMeta.name}>
            {agentMeta.emoji}
          </span>
        )}
      </motion.button>
    )
  }

  if (node._dir) {
    return (
      <div className="file-tree-dir">
        <button
          className="file-tree-item file-tree-dir-btn"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <motion.span
            className="file-tree-dir-chevron"
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight size={12} />
          </motion.span>
          {expanded ? <FolderOpen size={14} className="file-tree-dir-icon" /> : <Folder size={14} className="file-tree-dir-icon" />}
          <span className="file-tree-dir-name">{name}</span>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {Object.entries(node._children || {}).sort(([, a], [, b]) => {
                if (a._dir && !b._dir) return -1
                if (!a._dir && b._dir) return 1
                return 0
              }).map(([childName, childNode]) => (
                <TreeNode
                  key={childName}
                  name={childName}
                  node={childNode}
                  depth={depth + 1}
                  files={files}
                  selectedFile={selectedFile}
                  onSelectFile={onSelectFile}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return null
}

export default function FileTree({ files, selectedFile, onSelectFile }) {
  // Build tree from files Map
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

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>Files</span>
        <span className="file-tree-count">{files.size}</span>
      </div>

      <div className="file-tree-scroll">
        {files.size === 0 ? (
          <div className="file-tree-empty">
            <Folder size={20} />
            <span>No files yet</span>
          </div>
        ) : (
          Object.entries(tree).sort(([, a], [, b]) => {
            if (a._dir && !b._dir) return -1
            if (!a._dir && b._dir) return 1
            return 0
          }).map(([name, node]) => (
            <TreeNode
              key={name}
              name={name}
              node={node}
              files={files}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  )
}
