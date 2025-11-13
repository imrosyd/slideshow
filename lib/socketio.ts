/**
 * Socket.io Client for Realtime Updates
 * Fallback untuk Supabase Realtime
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  // Only initialize socket.io if running in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing socket if already connected
  if (socket && socket.connected) {
    return socket;
  }

  // Create new socket connection
  try {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    socket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket.io] Connection error:', error.message);
    });

    return socket;
  } catch (error) {
    console.error('[Socket.io] Failed to initialize:', error);
    return null;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket.io] Disconnected');
  }
}

// Helper functions for common operations
export function emitRemoteCommand(command: string, data?: any) {
  const sock = getSocket();
  if (sock) {
    sock.emit('remote-command', { command, data, timestamp: Date.now() });
  }
}

export function emitStatusUpdate(status: any) {
  const sock = getSocket();
  if (sock) {
    sock.emit('slideshow-status', status);
  }
}

export function emitImageUpdate(data?: any) {
  const sock = getSocket();
  if (sock) {
    sock.emit('image-updated', { ...data, timestamp: Date.now() });
  }
}

export function emitVideoUpdate(data: any) {
  const sock = getSocket();
  if (sock) {
    sock.emit('video-updated', data);
  }
}

export function emitForceRefresh() {
  const sock = getSocket();
  if (sock) {
    sock.emit('force-refresh', { timestamp: Date.now() });
  }
}

export function requestStatus() {
  const sock = getSocket();
  if (sock) {
    sock.emit('request-status', { timestamp: Date.now() });
  }
}
