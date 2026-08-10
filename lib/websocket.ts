import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer;

export const initWebSocketServer = (server: any) => {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: any, socket: any, head: any) => {
    const pathname = request.url;

    // Only handle our dedicated WS path. Next.js registers its own
    // 'upgrade' listener on this same server; for paths that match a real
    // Next.js route it destroys the socket right after our handshake,
    // causing an immediate connect/disconnect loop on the client. Using a
    // path Next.js doesn't own avoids that collision entirely.
    if (pathname !== '/ws') {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  console.log('WebSocket server initialized');
};

export const broadcast = (message: string) => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};
