// src/config/config.js
// Check if we're in Electron
const isElectron = () => {
  return window && window.process && window.process.type === 'renderer';
};

// Get base URL - try multiple sources
const getBaseUrl = () => {
  // Try import.meta.env first (for Vite dev)
  if (import.meta && import.meta.env && import.meta.env.VITE_REACT_BACKEND_BASE) {
    return import.meta.env.VITE_REACT_BACKEND_BASE;
  }
  
  // Try process.env (for Electron)
  if (process && process.env && process.env.VITE_REACT_BACKEND_BASE) {
    return process.env.VITE_REACT_BACKEND_BASE;
  }
  
  // Fallback to hardcoded IP
  return 'http://10.12.19.76:3000/api';
};

export const VITE_REACT_BACKEND_BASE = getBaseUrl();
export const VITE_BACKEND_URL = VITE_REACT_BACKEND_BASE.replace('/api', '');
export const VITE_LOCAL_IP = '10.12.19.76';
export const VITE_BACKEND_PORT = 3000;