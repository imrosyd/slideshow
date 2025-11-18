import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer;

export const initWebSocketServer = (server: any) => {
  wss = new WebSocketServer({ server });

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
