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

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('[Server] Initializing Next.js application...');
console.log('[Server] Environment:', dev ? 'development' : 'production');
console.log('[Server] Port:', port);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Handle request with Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  })
  .listen(port, hostname, (err) => {
    if (err) {
      console.error('[Server] Failed to start:', err);
      throw err;
    }
    console.log(`[Server] ✓ Ready on http://${hostname}:${port}`);
    console.log('[Server] Press Ctrl+C to stop');
  })
  .on('error', (err) => {
    console.error('[Server] Server error:', err);
  });
}).catch((err) => {
  console.error('[Server] Failed to prepare app:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
