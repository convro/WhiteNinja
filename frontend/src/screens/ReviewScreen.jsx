import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, RotateCcw, CheckCircle, FileCode, ExternalLink, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import './ReviewScreen.css'

export default function ReviewScreen({ result, brief, onStartOver }) {
  const files = result?.files || []
  const previewUrl = result?.previewUrl || null
  const [copied, setCopied] = useState(false)

  const fullPreviewUrl = previewUrl
    ? `${window.location.origin}${previewUrl}`
    : null

  if (!previewUrl) {
    console.warn('[ReviewScreen] previewUrl is missing from build result:', { resultKeys: result ? Object.keys(result) : 'null', previewUrl: result?.previewUrl })
  }

  const handleCopyLink = async () => {
    if (!fullPreviewUrl) return
    try {
      await navigator.clipboard.writeText(fullPreviewUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })

      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'white-ninja-build.zip'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded!')
    } catch (err) {
      toast.error('Download failed — try again')
    }
  }

  return (
    <div className="review-screen">
      <div className="review-orb" />

      <motion.div
        className="review-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Success banner */}
        <div className="review-success-banner">
          <motion.div
            className="review-success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          >
            <CheckCircle size={40} />
          </motion.div>
          <div>
            <h2>Build Complete!</h2>
            <p>The team of 5 agents successfully built your website.</p>
          </div>
        </div>

        {/* Brief */}
        <div className="review-brief">
          <div className="review-section-label">What was built</div>
          <p>{brief}</p>
        </div>

        {/* Summary */}
        {result?.summary && (
          <div className="review-summary">
            <div className="review-section-label">Agent Summary</div>
            <p>{result.summary}</p>
          </div>
        )}

        {/* File list */}
        <div className="review-files">
          <div className="review-section-label">
            Generated Files
            <span className="review-file-count">{files.length} files</span>
          </div>
          <div className="review-file-list">
            {files.map((file, i) => (
              <motion.div
                key={file.path}
                className="review-file-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <FileCode size={14} className="review-file-icon" />
                <code className="review-file-path">{file.path}</code>
                <span className="review-file-size">{formatBytes(file.content?.length || 0)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Shareable Link */}
        <motion.div
          className="review-share"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="review-section-label">
            Live Preview
            {fullPreviewUrl && <span className="review-share-badge">shareable</span>}
          </div>
          {fullPreviewUrl ? (
            <div className="review-share-row">
              <code className="review-share-url">{fullPreviewUrl}</code>
              <button className="btn btn-sm btn-ghost review-share-copy" onClick={handleCopyLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <a
                className="btn btn-sm btn-secondary review-share-open"
                href={fullPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                Open
              </a>
            </div>
          ) : (
            <p className="review-share-unavailable">
              Preview link unavailable — download the ZIP below to view locally.
            </p>
          )}
        </motion.div>

        {/* Actions */}
        <div className="review-actions">
          <motion.button
            className="btn btn-primary review-download-btn"
            onClick={handleDownload}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download size={16} />
            Download ZIP
          </motion.button>

          {fullPreviewUrl && (
            <motion.a
              className="btn btn-secondary review-open-btn"
              href={fullPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink size={16} />
              Open Live Preview
            </motion.a>
          )}

          <motion.button
            className="btn btn-secondary"
            onClick={onStartOver}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw size={16} />
            Build Another
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
