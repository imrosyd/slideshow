import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const generateNumericId = (): string => {
  // Generate a random 4-digit number
  // Min: 1000, Max: 9999
  const min = 1000;
  const max = 9999;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

const getDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  let deviceId = localStorage.getItem('deviceId');

  if (deviceId) {
    // If an ID exists, check if it's numeric and 4 digits
    const isNumeric = /^\d{4}$/.test(deviceId);

    if (!isNumeric) {
      // If not 4-digit numeric (old format), generate new one
      deviceId = generateNumericId();
      localStorage.setItem('deviceId', deviceId);
    }
  } else {
    // If no ID exists, generate a new 4-digit numeric one.
    deviceId = generateNumericId();
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
