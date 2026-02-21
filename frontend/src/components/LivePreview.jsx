import { useState, useRef, useEffect } from 'react'
import { Monitor, Tablet, Smartphone, Code2, RefreshCw, Eye } from 'lucide-react'
import './LivePreview.css'

const VIEWPORTS = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', width: '1280px', px: 1280, scale: true },
  { id: 'tablet', icon: Tablet, label: 'Tablet', width: '768px', px: 768 },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', width: '390px', px: 390 },
]

export default function LivePreview({ previewHtml, selectedFile, files }) {
  const [viewport, setViewport] = useState('desktop')
  const [showCode, setShowCode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [scaleFactor, setScaleFactor] = useState(1)
  const iframeRef = useRef(null)
  const wrapRef = useRef(null)

  const currentViewport = VIEWPORTS.find(v => v.id === viewport)
  const codeContent = selectedFile && files.get(selectedFile)?.content

  // Calculate scale factor for desktop viewport to fit in the container
  useEffect(() => {
    if (!currentViewport.scale || showCode) return
    const wrap = wrapRef.current
    if (!wrap) return

    const recalc = () => {
      const wrapW = wrap.clientWidth - 24 // subtract padding
      const targetW = currentViewport.px
      const s = Math.min(1, wrapW / targetW)
      setScaleFactor(s)
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [viewport, showCode, currentViewport])

  // Auto-switch to code view when a file is selected from the tree
  useEffect(() => {
    if (selectedFile) {
      setShowCode(true)
    }
  }, [selectedFile])

  const handleViewportClick = (vpId) => {
    setViewport(vpId)
    setShowCode(false)
  }

  const handleCodeToggle = () => {
    setShowCode(prev => !prev)
  }

  return (
    <div className="live-preview">
      <div className="live-preview-header">
        <div className="live-preview-viewports">
          {VIEWPORTS.map(vp => (
            <button
              key={vp.id}
              className={`live-preview-vp-btn ${viewport === vp.id && !showCode ? 'active' : ''}`}
              onClick={() => handleViewportClick(vp.id)}
              title={vp.label}
            >
              <vp.icon size={14} />
            </button>
          ))}
        </div>

        {!showCode && (
          <div className="live-preview-vp-label">
            {currentViewport.px ? `${currentViewport.px}px` : '100%'} — {currentViewport.label}
            {currentViewport.scale && scaleFactor < 1 ? ` (${Math.round(scaleFactor * 100)}%)` : ''}
          </div>
        )}
        {showCode && selectedFile && (
          <div className="live-preview-vp-label live-preview-vp-label--code">
            {selectedFile}
          </div>
        )}

        <div className="live-preview-actions">
          <button
            className={`live-preview-vp-btn ${showCode ? 'active' : ''}`}
            onClick={handleCodeToggle}
            title={showCode ? 'Show preview' : 'View code'}
          >
            {showCode ? <Eye size={14} /> : <Code2 size={14} />}
          </button>
          <button
            className="live-preview-vp-btn"
            onClick={() => setRefreshKey(k => k + 1)}
            title="Refresh preview"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="live-preview-content">
        {showCode ? (
          <div className="live-preview-code">
            {selectedFile ? (
              <>
                <div className="live-preview-code-path">
                  <Code2 size={12} />
                  <span>{selectedFile}</span>
                  <span className="live-preview-code-lines">
                    {codeContent ? codeContent.split('\n').length + ' lines' : ''}
                  </span>
                </div>
                <pre className="live-preview-code-block">
                  <code>{codeContent || '// Empty file'}</code>
                </pre>
              </>
            ) : (
              <div className="live-preview-no-file">
                <Code2 size={24} />
                <p>Click a file in the tree to view its code</p>
              </div>
            )}
          </div>
        ) : (
          <div className="live-preview-iframe-wrap" ref={wrapRef}>
            <div
              className={`live-preview-iframe-container viewport-${viewport}`}
              style={{
                width: currentViewport.width,
                ...(currentViewport.scale ? {
                  transform: `scale(${scaleFactor})`,
                  transformOrigin: 'top left',
                } : {}),
              }}
            >
              {previewHtml ? (
                <iframe
                  ref={iframeRef}
                  key={refreshKey}
                  className="live-preview-iframe"
                  srcDoc={previewHtml}
                  title="Live Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="live-preview-placeholder">
                  <div className="live-preview-placeholder-grid">
                    <div className="pp-nav" />
                    <div className="pp-hero" />
                    <div className="pp-section">
                      <div className="pp-card" />
                      <div className="pp-card" />
                      <div className="pp-card" />
                    </div>
                  </div>
                  <p>Preview will appear as agents build</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
