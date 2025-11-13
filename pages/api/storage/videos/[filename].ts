/**
 * Serve videos from filesystem storage
 * Only used when USE_FILESYSTEM_STORAGE=true
 * Supports range requests for video streaming
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Security: Prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
  const filepath = path.join(storageDir, 'videos', sanitizedFilename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  try {
    const stat = fs.statSync(filepath);

    // Set basic headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Handle range requests (required for video scrubbing)
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });

      const stream = fs.createReadStream(filepath, { start, end });
      stream.on('error', (error) => {
        console.error('[Storage API] Stream error:', error);
        res.end();
      });
      stream.pipe(res);
    } else {
      // No range request, send entire file
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'video/mp4',
      });

      const stream = fs.createReadStream(filepath);
      stream.on('error', (error) => {
        console.error('[Storage API] Stream error:', error);
        res.end();
      });
      stream.pipe(res);
    }
  } catch (error) {
    console.error('[Storage API] Error serving video:', error);
    return res.status(500).json({ error: 'Failed to serve video' });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
