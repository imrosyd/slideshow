import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const getDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    // Generate a full UUID and take the first 8 characters
    deviceId = uuidv4().substring(0, 8);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const useDeviceId = (): string => {
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  return deviceId;
};
