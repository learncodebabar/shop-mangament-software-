import { networkInterfaces } from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lookupPromise = promisify(dns.lookup);

const getIPv4Addresses = () => {
  const nets = networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          interface: name,
          address: net.address,
          mac: net.mac
        });
      }
    }
  }
  return addresses;
};

const getHostnameAddress = async () => {
  try {
    const result = await lookupPromise(os.hostname());
    return result.address;
  } catch (error) {
    return 'localhost';
  }
};

const updateEnvFile = async () => {
  const addresses = getIPv4Addresses();
  const hostnameAddr = await getHostnameAddress();
  
  console.log('\n🌐 Network Detection Results:');
  console.log('==============================');
  console.log(`Hostname: ${os.hostname()}`);
  
  if (addresses.length === 0) {
    console.log('❌ No network interfaces found');
    return;
  }
  
  console.log('\n📡 Available Network Interfaces:');
  addresses.forEach((addr, index) => {
    console.log(`   ${index + 1}. ${addr.interface}: ${addr.address}`);
  });
  
  // Use the first non-internal IPv4 address
  const primaryIP = addresses[0]?.address || 'localhost';
  
  // Update .env file
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Add/update network variables
  const lines = envContent.split('\n');
  const newLines = [];
  const vars = {
    VITE_LOCAL_IP: primaryIP,
    VITE_BACKEND_URL: `http://${primaryIP}:3000`,
    VITE_REACT_BACKEND_BASE: `http://${primaryIP}:3000/api`,
    VITE_BACKEND_PORT: '3000'
  };
  
  // Track which vars we've updated
  const updated = {};
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    let found = false;
    for (const [key, value] of Object.entries(vars)) {
      if (line.startsWith(key + '=')) {
        newLines.push(`${key}=${value}`);
        updated[key] = true;
        found = true;
        break;
      }
    }
    if (!found) {
      newLines.push(line);
    }
  }
  
  // Add any missing vars
  for (const [key, value] of Object.entries(vars)) {
    if (!updated[key]) {
      newLines.push(`${key}=${value}`);
    }
  }
  
  // Write to both .env and .env.local
  fs.writeFileSync(envPath, newLines.join('\n'));
  fs.writeFileSync(envLocalPath, newLines.join('\n'));
  
  console.log('\n✅ Updated environment files with:');
  console.log(`   VITE_LOCAL_IP=${primaryIP}`);
  console.log(`   VITE_BACKEND_URL=http://${primaryIP}:3000`);
  console.log(`   VITE_REACT_BACKEND_BASE=http://${primaryIP}:3000/api`);
  
  console.log('\n📱 Access URLs:');
  console.log(`   Local:    http://localhost:5173`);
  console.log(`   Network:  http://${primaryIP}:5173`);
  console.log(`   Backend:  http://${primaryIP}:3000`);
  console.log(`   Backend API: http://${primaryIP}:3000/api\n`);
  
  // Test if backend is reachable
  try {
    const response = await fetch(`http://${primaryIP}:3000/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is reachable!');
      console.log(`   Server IP: ${data.serverIP}`);
    } else {
      console.log('⚠️  Backend responded but with error');
    }
  } catch (error) {
    console.log('⚠️  Backend not reachable. Make sure your backend server is running on port 3000');
  }
};

// Run the function
updateEnvFile().catch(console.error);