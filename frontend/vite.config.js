import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5585,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3006',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      }
    }
  }
})
