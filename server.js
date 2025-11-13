/**
 * Custom Next.js Server with Socket.io for Realtime Updates
 * 
 * This server enables realtime features without Supabase:
 * - WebSocket connections via Socket.io
 * - Remote control commands
 * - Status broadcasts
 * - Image/video updates
 * 
 * Usage:
 * - Development: npm run dev (or node server.js)
 * - Production: npm run build && node server.js
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('[Server] Initializing Next.js application...');
console.log('[Server] Environment:', dev ? 'development' : 'production');
console.log('[Server] Port:', port);

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Setup Socket.io for realtime updates
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  // Track connected clients
  let connectedClients = 0;

  io.on('connection', (socket) => {
    connectedClients++;
    console.log(`[Socket.io] Client connected: ${socket.id} (Total: ${connectedClients})`);

    // Remote control commands (from /remote page to main page)
    socket.on('remote-command', (data) => {
      console.log(`[Socket.io] Remote command from ${socket.id}:`, data.command);
      socket.broadcast.emit('remote-command', data);
    });

    // Request status (remote page requests current slideshow status)
    socket.on('request-status', (data) => {
      console.log(`[Socket.io] Status requested by ${socket.id}`);
      socket.broadcast.emit('request-status', data);
    });

    // Slideshow status updates (main page broadcasts status to remote)
    socket.on('slideshow-status', (data) => {
      console.log(`[Socket.io] Status update from ${socket.id}:`, {
        total: data.total,
        current: data.current,
        paused: data.paused
      });
      socket.broadcast.emit('slideshow-status', data);
    });

    // Image metadata updates
    socket.on('image-updated', (data) => {
      console.log(`[Socket.io] Image updated by ${socket.id}`);
      io.emit('image-updated', data);
    });

    // Video updates
    socket.on('video-updated', (data) => {
      console.log(`[Socket.io] Video updated by ${socket.id}:`, data.action);
      io.emit('video-updated', data);
    });

    // Force refresh command
    socket.on('force-refresh', (data) => {
      console.log(`[Socket.io] Force refresh by ${socket.id}`);
      io.emit('force-refresh', data);
    });

    // Image closed notification
    socket.on('image-closed', (data) => {
      console.log(`[Socket.io] Image closed by ${socket.id}`);
      io.emit('image-closed', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      connectedClients--;
      console.log(`[Socket.io] Client disconnected: ${socket.id} (Total: ${connectedClients})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket.io] Socket error from ${socket.id}:`, error);
    });
  });

  // Start server
  httpServer.listen(port, hostname, (err) => {
    if (err) {
      console.error('[Server] Failed to start:', err);
      throw err;
    }
    console.log(`[Server] ✓ Ready on http://${hostname}:${port}`);
    console.log(`[Server] ✓ Socket.io enabled for realtime updates`);
    console.log('[Server] Press Ctrl+C to stop');
  })
  .on('error', (err) => {
    console.error('[Server] Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use. Try a different port.`);
    }
    process.exit(1);
  });

}).catch((err) => {
  console.error('[Server] Failed to prepare app:', err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  console.log('[Server] Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
