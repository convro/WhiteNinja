/**
 * Virtual File System for the build session.
 * Stores files in memory as Map<path, FileEntry>
 */
export class FileManager {
  constructor() {
    this.files = new Map()
    this.totalModifications = 0
    this.agentContributions = new Map()
  }

  create(path, content, agentId) {
    const sanitizedPath = this.sanitizePath(path)
    const byteSize = content ? Buffer.byteLength(content, 'utf8') : 0
    const lineCount = content ? content.split('\n').length : 0

    this.files.set(sanitizedPath, {
      path: sanitizedPath,
      content,
      agentId,
      byteSize,
      lineCount,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      modifyCount: 0,
      history: [{ content, agentId, at: Date.now() }],
    })

    this.trackContribution(agentId, sanitizedPath, 'create')
    return this.files.get(sanitizedPath)
  }

  modify(path, content, agentId) {
    const sanitizedPath = this.sanitizePath(path)
    const existing = this.files.get(sanitizedPath)
    if (!existing) {
      return this.create(sanitizedPath, content, agentId)
    }

    const diff = computeSimpleDiff(existing.content, content)
    const byteSize = content ? Buffer.byteLength(content, 'utf8') : 0
    const lineCount = content ? content.split('\n').length : 0

    // Limit history to last 10 versions to prevent memory bloat
    const history = [...(existing.history || [])].slice(-9)
    history.push({ content, agentId, at: Date.now() })

    const updated = {
      ...existing,
      content,
      agentId,
      byteSize,
      lineCount,
      modifiedAt: Date.now(),
      modifyCount: (existing.modifyCount || 0) + 1,
      diff,
      history,
    }
    this.files.set(sanitizedPath, updated)
    this.totalModifications++
    this.trackContribution(agentId, sanitizedPath, 'modify')
    return updated
  }

  delete(path) {
    const sanitizedPath = this.sanitizePath(path)
    const file = this.files.get(sanitizedPath)
    this.files.delete(sanitizedPath)
    return file
  }

  get(path) {
    return this.files.get(this.sanitizePath(path))
  }

  getAll() {
    return Array.from(this.files.values())
  }

  getPaths() {
    return Array.from(this.files.keys())
  }

  getByExtensions(exts) {
    return this.getAll().filter(f => exts.some(ext => f.path.endsWith(ext)))
  }

  sanitizePath(path) {
    return path.replace(/^\/+/, '').replace(/\.\./g, '').replace(/\/+/g, '/')
  }

  trackContribution(agentId, path, action) {
    if (!agentId) return
    if (!this.agentContributions.has(agentId)) {
      this.agentContributions.set(agentId, { files: new Set(), actions: 0 })
    }
    const contrib = this.agentContributions.get(agentId)
    contrib.files.add(path)
    contrib.actions++
  }

  getStats() {
    let totalLines = 0
    let totalBytes = 0
    for (const file of this.files.values()) {
      totalLines += file.lineCount || 0
      totalBytes += file.byteSize || 0
    }

    const contributions = {}
    for (const [agentId, data] of this.agentContributions) {
      contributions[agentId] = {
        fileCount: data.files.size,
        actionCount: data.actions,
        files: Array.from(data.files),
      }
    }

    return {
      fileCount: this.files.size,
      totalLines,
      totalBytes,
      totalModifications: this.totalModifications,
      contributions,
    }
  }

  /**
   * Build a combined HTML preview (srcdoc)
   */
  buildPreview() {
    const htmlFile = this.getAll().find(f =>
      f.path === 'index.html' || f.path.endsWith('/index.html')
    )
    const cssFiles = this.getByExtensions(['.css'])
    const jsFiles = this.getByExtensions(['.js'])

    if (!htmlFile) {
      const html = this.generateSkeletonPreview()
      return { html: html.html, css: html.css, js: '' }
    }

    const html = htmlFile.content || ''
    const css = cssFiles.map(f => f.content).join('\n')
    const js = jsFiles.map(f => f.content).join('\n')

    return { html, css, js }
  }

  generateSkeletonPreview() {
    const allFiles = this.getAll()
    const sections = allFiles
      .filter(f => f.path.endsWith('.html'))
      .map(f => f.content)
      .join('\n')

    return {
      html: sections || '<div style="color:#666;font-family:system-ui;padding:40px;text-align:center"><p>Building your website...</p></div>',
      css: '',
    }
  }

  /**
   * Serialize for download
   */
  toArray() {
    return this.getAll().map(f => ({
      path: f.path,
      content: f.content,
      agentId: f.agentId,
      byteSize: f.byteSize,
      lineCount: f.lineCount,
    }))
  }
}

/**
 * Simple line-based diff for display
 */
function computeSimpleDiff(oldContent, newContent) {
  if (!oldContent && newContent) {
    return { added: newContent.split('\n').length, removed: 0, oldLines: 0, newLines: newContent.split('\n').length }
  }
  if (!newContent) {
    return { added: 0, removed: oldContent ? oldContent.split('\n').length : 0, oldLines: oldContent ? oldContent.split('\n').length : 0, newLines: 0 }
  }

  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  let added = 0
  let removed = 0
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    if (i >= oldLines.length) added++
    else if (i >= newLines.length) removed++
    else if (oldLines[i] !== newLines[i]) { added++; removed++ }
  }

  return { added, removed, oldLines: oldLines.length, newLines: newLines.length }
}
