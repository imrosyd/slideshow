"use strict";
/**
 * Custom Next.js Server for Shared Hosting (cPanel)
 *
 * This server file is required for running Next.js on shared hosting
 * with cPanel Node.js selector or similar setups.
 *
 * Usage:
 * - Set this as your "Application startup file" in cPanel Node.js App setup
 * - Make sure PORT environment variable is set (cPanel does this automatically)
 *
 * For standard VPS/dedicated hosting, you don't need this file.
 * Just use: npm start (which runs next start)
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var createServer = require('http').createServer;
var parse = require('url').parse;
var next = require('next');
var initWebSocketServer = require('./lib/websocket').initWebSocketServer;
var dev = process.env.NODE_ENV !== 'production';
var hostname = 'localhost';
var port = process.env.PORT || 3000;
// Initialize Next.js app
var app = next({ dev: dev, hostname: hostname, port: port });
var handle = app.getRequestHandler();
console.log('[Server] Initializing Next.js application...');
console.log('[Server] Environment:', dev ? 'development' : 'production');
console.log('[Server] Port:', port);
app.prepare().then(function () {
    var server = createServer(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
        var parsedUrl, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    parsedUrl = parse(req.url, true);
                    // Handle request with Next.js
                    return [4 /*yield*/, handle(req, res, parsedUrl)];
                case 1:
                    // Handle request with Next.js
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error('[Server] Error occurred handling', req.url, err_1);
                    res.statusCode = 500;
                    res.end('Internal server error');
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); })
        .listen(port, hostname, function (err) {
        if (err) {
            console.error('[Server] Failed to start:', err);
            throw err;
        }
        console.log("[Server] \u2713 Ready on http://".concat(hostname, ":").concat(port));
        console.log('[Server] Press Ctrl+C to stop');
    })
        .on('error', function (err) {
        console.error('[Server] Server error:', err);
    });
    // Initialize WebSocket server
    initWebSocketServer(server);
}).catch(function (err) {
    console.error('[Server] Failed to prepare app:', err);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', function () {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', function () {
    console.log('[Server] SIGINT received, shutting down gracefully...');
    process.exit(0);
});
