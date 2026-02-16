import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), 'VITE_') // Only VITE_ prefixed vars

  const localIP = env.VITE_LOCAL_IP || 'localhost'
  const backendPort = env.VITE_BACKEND_PORT || 3000
  const backendURL = env.VITE_BACKEND_URL || `http://${localIP}:${backendPort}`
  const apiBase = env.VITE_REACT_BACKEND_BASE || `${backendURL}/api`

  return {
    plugins: [react()],
    base: './',
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://${localIP}:${backendPort}`,
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: `http://${localIP}:${backendPort}`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'import.meta.env.VITE_LOCAL_IP': JSON.stringify(localIP),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendURL),
      'import.meta.env.VITE_REACT_BACKEND_BASE': JSON.stringify(apiBase)
    }
  }
})
