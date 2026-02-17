import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          border: 'var(--border-subtle)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-main)',
        },
      }}
    />
  </React.StrictMode>
)
