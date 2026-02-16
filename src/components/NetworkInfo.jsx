import React, { useState, useEffect } from 'react';
import api from '../api/api';

const NetworkInfo = () => {
  const [ip, setIp] = useState('');

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await api.get('/local-ip');
        setIp(res.data.ip);
      } catch (err) {
        console.log('Could not fetch IP');
      }
    };
    fetchIp();
  }, []);

  if (!ip) return null;

  return (
    <div className="alert alert-secondary mb-4" role="alert">
      <div className="d-flex align-items-center">
        <i className="bi bi-hdd-network fs-4 me-3"></i>
        <div>
          <strong>Network Access:</strong> 
          <code className="ms-2">http://{ip}:5173</code>
          <span className="ms-3 badge bg-info">Same WiFi required</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkInfo;