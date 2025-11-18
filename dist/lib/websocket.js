"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = exports.initWebSocketServer = void 0;
var ws_1 = require("ws");
var wss;
var initWebSocketServer = function (server) {
    wss = new ws_1.WebSocketServer({ server: server });
    wss.on('connection', function (ws) {
        console.log('Client connected');
        ws.on('close', function () { return console.log('Client disconnected'); });
    });
    console.log('WebSocket server initialized');
};
exports.initWebSocketServer = initWebSocketServer;
var broadcast = function (message) {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }
    wss.clients.forEach(function (client) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(message);
        }
    });
};
exports.broadcast = broadcast;
