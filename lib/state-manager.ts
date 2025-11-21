// lib/state-manager.ts

export interface Command {
  type: string;
  data?: any;
}

interface ClientState {
  lastSeen: number;
}

// Type for active image information
export type ActiveImageInfo = {
  name: string;
  url: string;
} | null;

// Use a global object to ensure a single instance across hot-reloads in development.
const globalForState = global as typeof global & {
  liveClients: Map<string, ClientState>;
  commandQueue: Map<string, Command[]>;
  activeImages: Map<string, ActiveImageInfo>; // New map for active images
};

if (!globalForState.liveClients) {
  globalForState.liveClients = new Map<string, ClientState>();
}
if (!globalForState.commandQueue) {
  globalForState.commandQueue = new Map<string, Command[]>();
}
if (!globalForState.activeImages) {
  globalForState.activeImages = new Map<string, ActiveImageInfo>();
}

export const liveClients = globalForState.liveClients;
export const commandQueue = globalForState.commandQueue;
export const activeImages = globalForState.activeImages;

// Clients are considered stale after this many milliseconds.
export const CLIENT_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Removes clients that haven't sent a heartbeat in a while.
 */
export function garbageCollectClients() {
  const now = Date.now();
  for (const [deviceId, state] of liveClients.entries()) {
    if (now - state.lastSeen > CLIENT_TIMEOUT_MS) {
      liveClients.delete(deviceId);
      // Also clear any commands for the timed-out client
      commandQueue.delete(deviceId);
      // *** NEW: Also clear activeImage for the timed-out client ***
      activeImages.delete(deviceId);
      console.log(`[State Manager] Garbage collected stale client: ${deviceId}`);
    }
  }
}
