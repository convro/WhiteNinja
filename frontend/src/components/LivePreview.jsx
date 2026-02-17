import { useState, useRef, useEffect } from 'react'
import { Monitor, Tablet, Smartphone, Code2, RefreshCw } from 'lucide-react'
import './LivePreview.css'

const VIEWPORTS = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', width: '100%' },
  { id: 'tablet', icon: Tablet, label: 'Tablet', width: '768px' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', width: '390px' },
]

export default function LivePreview({ previewHtml, selectedFile, files }) {
  const [viewport, setViewport] = useState('desktop')
  const [showCode, setShowCode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef(null)

  const currentViewport = VIEWPORTS.find(v => v.id === viewport)

  const codeContent = selectedFile && files.get(selectedFile)?.content

  return (
    <div className="live-preview">
      <div className="live-preview-header">
        <div className="live-preview-viewports">
          {VIEWPORTS.map(vp => (
            <button
              key={vp.id}
              className={`live-preview-vp-btn ${viewport === vp.id ? 'active' : ''} ${showCode ? 'disabled' : ''}`}
              onClick={() => { setViewport(vp.id); setShowCode(false) }}
              title={vp.label}
            >
              <vp.icon size={14} />
            </button>
          ))}
        </div>

        <div className="live-preview-actions">
          <button
            className={`live-preview-vp-btn ${showCode ? 'active' : ''}`}
            onClick={() => setShowCode(!showCode)}
            title="Toggle code view"
          >
            <Code2 size={14} />
          </button>
          <button
            className="live-preview-vp-btn"
            onClick={() => setRefreshKey(k => k + 1)}
            title="Refresh"
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
          <div className="live-preview-iframe-wrap">
            <div
              className="live-preview-iframe-container"
              style={{ maxWidth: currentViewport.width }}
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
                    <div className="pp-hero" />
                    <div className="pp-nav" />
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
