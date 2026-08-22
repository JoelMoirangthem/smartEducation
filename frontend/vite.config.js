import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Python agent service (must be listed BEFORE the generic /api rule)
      '/api/v1/agent': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/api/v1/ai/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      // Express API
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})