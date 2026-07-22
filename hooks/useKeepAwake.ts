import { useEffect, useRef } from 'react';

/**
 * Keep webOS TV awake for as long as this app is mounted.
 * Runs unconditionally (not gated on app-level pause/preview state) so a
 * stuck `isPaused`/overlay flag elsewhere can never cause the TV to standby.
 * Dispatches mouse events to prevent screen timeout.
 */
export function useKeepAwake() {
  const lastKeepAwakeRef = useRef(0);

  useEffect(() => {
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
  }, []);
}
