import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { VITE_LOCAL_IP } from './src/api/Vite_React_Backend_Base';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Try to read from .env.local first
  let localIP = VITE_LOCAL_IP || 'localhost';
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envLocal = fs.readFileSync(envLocalPath, 'utf8');
      const match = envLocal.match(/VITE_LOCAL_IP=(.+)/);
      if (match) {
        localIP = match[1].trim();
      }
    }
  } catch (error) {
    console.log('Could not read .env.local, using default');
  }

  return {
    plugins: [react()],
     base: './' ,
    server: {
      open: true,
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://${localIP}:3000`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        },
        '/uploads': {
          target: `http://${localIP}:3000`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'import.meta.env.VITE_LOCAL_IP': JSON.stringify(localIP),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(`http://${localIP}:3000`),
      'import.meta.env.VITE_REACT_BACKEND_BASE': JSON.stringify(`http://${localIP}:3000/api`)
    }
  };
});