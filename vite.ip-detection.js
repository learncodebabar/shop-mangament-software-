import { networkInterfaces } from 'os';
import fs from 'fs';
import path from 'next';

export default function ipDetectionPlugin() {
  return {
    name: 'vite-plugin-ip-detection',
    configureServer(server) {
      const getLocalIP = () => {
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
              return net.address;
            }
          }
        }
        return 'localhost';
      };

      const ip = getLocalIP();
      console.log('\n📡 Network Information:');
      console.log(`   Local:   http://localhost:5173`);
      console.log(`   Network: http://${ip}:5173`);
      console.log(`   Backend: http://${ip}:3000\n`);
      
      // Write IP to a file that can be imported
      const envContent = `VITE_LOCAL_IP=${ip}\nVITE_BACKEND_PORT=3000\n`;
      fs.writeFileSync('.env.local', envContent);
    }
  };
}