import axios from 'axios';
import { VITE_BACKEND_URL } from './Vite_React_Backend_Base';


class NetworkClient {
  constructor() {
    this.baseURL = '';
    this.apiURL = '';
    this.init();
  }

  init() {
    const { hostname, protocol } = window.location;
    const port = '3000';
    
    // Get all possible IPs from various sources
    this.backendCandidates = [
      // If accessing via IP, try that IP first
      `${protocol}//${hostname}:${port}`,
      // Localhost alternatives
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      // IPv6 localhost
      'http://[::1]:3000',
      // Try to get from environment
      VITE_BACKEND_URL,
      import.meta.env.VITE_LOCAL_IP ? `http://${import.meta.env.VITE_LOCAL_IP}:3000` : null,
      // Try common local IPs as fallback
      'http://192.168.1.100:3000',
      'http://192.168.0.100:3000',
      'http://10.0.0.100:3000'
    ].filter(Boolean);

    // Remove duplicates
    this.backendCandidates = [...new Set(this.backendCandidates)];
    
    this.currentBackendIndex = 0;
    console.log('🔍 Backend candidates:', this.backendCandidates);
  }

  async testConnection(url) {
    try {
      console.log(`Testing connection to: ${url}/api/health`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${url}/api/health`, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Connected to ${url} - Server IP: ${data.serverIP}`);
        return true;
      }
      return false;
    } catch (error) {
      console.log(`❌ Failed to connect to ${url}:`, error.message);
      return false;
    }
  }

  async findWorkingBackend() {
    console.log('🔎 Searching for working backend...');
    
    for (let i = 0; i < this.backendCandidates.length; i++) {
      const url = this.backendCandidates[i];
      console.log(`Testing ${i + 1}/${this.backendCandidates.length}: ${url}`);
      
      if (await this.testConnection(url)) {
        this.setBackend(url);
        console.log(`✨ Using backend: ${url}`);
        return true;
      }
    }
    
    console.error('❌ No working backend found');
    return false;
  }

  setBackend(url) {
    this.baseURL = url;
    this.apiURL = `${url}/api`;
    
    // Update axios default
    axios.defaults.baseURL = this.apiURL;
    
    // Store in localStorage for persistence
    localStorage.setItem('backend_url', url);
  }

  getApiUrl() {
    return this.apiURL || localStorage.getItem('backend_url') + '/api';
  }

  getBaseUrl() {
    return this.baseURL || localStorage.getItem('backend_url');
  }

  getImageUrl(imagePath) {
    if (!imagePath) return '';
    // Remove any leading /api if present
    const cleanPath = imagePath.replace(/^\/api/, '');
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}${cleanPath}`;
  }
}

export const networkClient = new NetworkClient();