"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = exports.initWebSocketServer = void 0;
const ws_1 = require("ws");
let wss;
const initWebSocketServer = (server) => {
    wss = new ws_1.WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
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
    wss.on('connection', (ws) => {
        console.log('Client connected');
        ws.on('close', () => console.log('Client disconnected'));
    });
    console.log('WebSocket server initialized');
};
exports.initWebSocketServer = initWebSocketServer;
const broadcast = (message) => {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(message);
        }
    });
};
exports.broadcast = broadcast;
