// hooks/useHeartbeat.ts
import { useEffect } from 'react';
import type { Command, ActiveImageInfo } from '../lib/state-manager'; // Import ActiveImageInfo

const HEARTBEAT_INTERVAL_MS = 3000; // 3 seconds

interface HeartbeatResponse {
  commands: Command[];
}

export const useHeartbeat = (
  deviceId: string,
  onCommand: (command: Command) => void,
  activeImage: ActiveImageInfo | null, // Add activeImage parameter
) => {
  useEffect(() => {
    if (!deviceId) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deviceId, activeImage }), // Include activeImage in the body
        });

        if (!response.ok) {
          console.error('[Heartbeat] Heartbeat request failed:', response.statusText);
          return;
        }

        const data: HeartbeatResponse = await response.json();

        if (data.commands && data.commands.length > 0) {
          console.log(`[Heartbeat] Received ${data.commands.length} command(s) from server.`);
          data.commands.forEach(onCommand);
        }
      } catch (error) {
        console.error('[Heartbeat] Error sending heartbeat:', error);
      }
    };

    // Send the first heartbeat immediately.
    sendHeartbeat();

    // Then send subsequent heartbeats on an interval.
    const intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Clear the interval when the component unmounts.
    return () => {
      clearInterval(intervalId);
    };
  }, [deviceId, onCommand, activeImage]); // Add activeImage to dependencies
};
