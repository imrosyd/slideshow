/**
 * Serve images from filesystem storage
 * Only used when USE_FILESYSTEM_STORAGE=true
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

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
  const filepath = path.join(storageDir, 'images', sanitizedFilename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  try {
    const stat = fs.statSync(filepath);
    const mimeType = mime.lookup(filepath) || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle range requests (for video scrubbing, large images)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });

      const stream = fs.createReadStream(filepath, { start, end });
      stream.pipe(res);
    } else {
      // Stream the entire file
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('[Storage API] Error serving image:', error);
    return res.status(500).json({ error: 'Failed to serve image' });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
