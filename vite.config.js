import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VITE_LOCAL_IP } from './src/api/Vite_React_Backend_Base'


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const localIP = VITE_LOCAL_IP || 'localhost'

  return {
    plugins: [react()],
    base: './',
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://${localIP}:3000`,
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: `http://${localIP}:3000`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'VITE_LOCAL_IP': JSON.stringify(localIP),
      'VITE_BACKEND_URL': JSON.stringify(`http://${localIP}:3000`),
      'VITE_REACT_BACKEND_BASE': JSON.stringify(`http://${localIP}:3000/api`)
    }
  }
})
