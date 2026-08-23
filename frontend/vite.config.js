import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/agent': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/v1/ai/chat': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true }
    }
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/qrcode') || id.includes('node_modules/html5-qrcode')) return 'qr';
          if (id.includes('node_modules/socket.io-client')) return 'socket';
          if (id.includes('node_modules/react') || id.includes('react-router')) return 'react-vendor';
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
