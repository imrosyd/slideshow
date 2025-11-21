import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const getDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  let deviceId = localStorage.getItem('deviceId');

  if (deviceId) {
    // If an ID exists and is longer than 8 characters (likely a full UUID),
    // truncate it and update localStorage.
    if (deviceId.length > 8) {
      deviceId = deviceId.substring(0, 8);
      localStorage.setItem('deviceId', deviceId); // Update stored ID
    }
  } else {
    // If no ID exists, generate a new 8-character one.
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
