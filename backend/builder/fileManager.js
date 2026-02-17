/**
 * Virtual File System for the build session.
 * Stores files in memory as Map<path, FileEntry>
 */
export class FileManager {
  constructor() {
    this.files = new Map()
  }

  create(path, content, agentId) {
    this.files.set(path, {
      path,
      content,
      agentId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      history: [{ content, agentId, at: Date.now() }],
    })
    return this.files.get(path)
  }

  modify(path, content, agentId) {
    const existing = this.files.get(path)
    if (!existing) {
      return this.create(path, content, agentId)
    }

    const diff = computeSimpleDiff(existing.content, content)
    const updated = {
      ...existing,
      content,
      agentId,
      modifiedAt: Date.now(),
      diff,
      history: [...(existing.history || []), { content, agentId, at: Date.now() }],
    }
    this.files.set(path, updated)
    return updated
  }

  delete(path, agentId) {
    const file = this.files.get(path)
    this.files.delete(path)
    return file
  }

  get(path) {
    return this.files.get(path)
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

  /**
   * Build a combined HTML preview (srcdoc)
   */
  buildPreview() {
    const htmlFile = this.getAll().find(f => f.path.endsWith('index.html') || f.path === 'index.html')
    const cssFiles = this.getByExtensions(['.css'])
    const jsFiles = this.getByExtensions(['.js'])

    if (!htmlFile) {
      // Generate a skeleton preview
      const html = this.generateSkeletonPreview()
      return { html: html.html, css: html.css, js: '' }
    }

    let html = htmlFile.content || ''
    const css = cssFiles.map(f => f.content).join('\n')
    const js = jsFiles.map(f => f.content).join('\n')

    return { html, css, js }
  }

  generateSkeletonPreview() {
    const allFiles = this.getAll()
    const sections = allFiles.filter(f => f.path.endsWith('.html')).map(f => f.content).join('\n')

    return {
      html: sections || '<p style="color:#666;font-family:sans-serif;padding:20px">Building...</p>',
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
    }))
  }
}

/**
 * Simple line-based diff for display
 */
function computeSimpleDiff(oldContent, newContent) {
  if (!oldContent) return { added: newContent.split('\n').length, removed: 0 }

  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  let added = 0, removed = 0
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    if (i >= oldLines.length) added++
    else if (i >= newLines.length) removed++
    else if (oldLines[i] !== newLines[i]) { added++; removed++ }
  }

  return { added, removed, oldLines: oldLines.length, newLines: newLines.length }
}
