import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_PORT = process.env.VITE_BACKEND_PORT || 3001

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5585,
    proxy: {
      '/ws': {
        target: `ws://localhost:${BACKEND_PORT}`,
        ws: true,
      },
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/test-builds': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      }
    }
  }
})
