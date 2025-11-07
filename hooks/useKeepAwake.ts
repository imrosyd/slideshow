import { useEffect, useRef } from 'react';

/**
 * Keep webOS TV awake during video playback
 * Dispatches mouse events to prevent screen timeout
 */
export function useKeepAwake(isPlaying: boolean) {
  const lastKeepAwakeRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;

    const triggerKeepAwake = () => {
      if (typeof document === 'undefined') return;
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    };

    // Trigger immediately when playback starts
    triggerKeepAwake();

    // Keep alive every 10 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastKeepAwakeRef.current >= 9000) {
        lastKeepAwakeRef.current = now;
        triggerKeepAwake();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying]);
}
