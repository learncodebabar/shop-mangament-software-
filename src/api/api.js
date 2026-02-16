import axios from "axios";
import { ViteBackendIP } from "./Vite_React_Backend_Base";

// Auto-detect backend URL
const getBackendURL = () => {
  // Check if auto-detect is enabled
  const autoDetect = import.meta.env.VITE_AUTO_DETECT_IP === "true";

  if (autoDetect) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    if (import.meta.env.MODE === "development") {
      const host = hostname === "localhost" ? "localhost" : hostname;
      const backendPort = "3000";
      return `${protocol}//${host}:${backendPort}/api`;
    }

    return `${protocol}//${hostname}/api`;
  }

  // Fallback to env variable
  return ViteBackendIP || "http://localhost:3000/api";
};

const api = axios.create({
  baseURL: getBackendURL(),
});

//  REMOVE - Token interceptor (Temporarily disabled)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Optional: Log backend URL for debugging
console.log("🔗 Backend URL:", getBackendURL());

export default api;
