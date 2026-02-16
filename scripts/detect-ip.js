import { networkInterfaces } from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ViteBackendIP } from '../src/api/Vite_React_Backend_Base';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLocalIP = () => {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const updateEnvFile = (ip) => {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  let envContent = '';
  
  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  }
  
  // Update or add IP-based URLs
  const lines = envContent.split('\n');
  const newLines = [];
  let hasViteBackend = false;
  let hasViteReactBackend = false;
  
  for (const line of lines) {
    if (line.startsWith('VITE_BACKEND_URL=')) {
      newLines.push(`VITE_BACKEND_URL=http://${ip}:3000`);
      hasViteBackend = true;
    } else if (line.startsWith('${ViteBackendIP}=')) {
      newLines.push(`${ViteBackendIP}=http://${ip}:3000/api`);
      hasViteReactBackend = true;
    } else {
      newLines.push(line);
    }
  }
  
  if (!hasViteBackend) {
    newLines.push(`VITE_BACKEND_URL=http://${ip}:3000`);
  }
  
  if (!hasViteReactBackend) {
    newLines.push(`VITE_REACT_BACKEND_BASE=http://${ip}:3000/api`);
  }
  
  // Add detected IP as a variable
  newLines.push(`VITE_LOCAL_IP=${ip}`);
  newLines.push(`VITE_BACKEND_PORT=3000`);
  
  fs.writeFileSync(envPath, newLines.join('\n'));
  console.log(`✅ Updated .env with IP: ${ip}`);
};

const ip = getLocalIP();
console.log(`📡 Detected local IP: ${ip}`);
updateEnvFile(ip);