"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = exports.initWebSocketServer = void 0;
const ws_1 = require("ws");
let wss;
const initWebSocketServer = (server) => {
    wss = new ws_1.WebSocketServer({ server });
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
