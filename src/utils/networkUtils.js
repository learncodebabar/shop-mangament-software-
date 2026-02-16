export const getLocalIP = () => {
  // This runs in the browser, so we need to get the current hostname
  const { hostname } = window.location;
  
  // If it's localhost, try to detect network IP
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // You can't directly get local IP from browser due to security restrictions
    // Return a configurable fallback
    return import.meta.env.VITE_LOCAL_IP || '192.168.1.100';
  }
  
  return hostname;
};

export const getBaseURL = () => {
  const hostname = getLocalIP();
  const protocol = window.location.protocol;
  const port = import.meta.env.VITE_BACKEND_PORT || '3000';
  
  return `${protocol}//${hostname}:${port}`;
};

export const getApiBaseURL = () => {
  return `${getBaseURL()}/api`;
};