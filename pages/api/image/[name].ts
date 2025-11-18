import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../lib/storage-adapter";
import { verifyAuth } from "../../../lib/auth";
import fs from 'fs/promises';

const ipBandwidthCache = new Map<string, { bytes: number; resetTime: number }>();
const BANDWIDTH_LIMIT = 50 * 1024 * 1024;
const BANDWIDTH_WINDOW = 60 * 60 * 1000;

function checkBandwidthQuota(ip: string, estimatedSize: number): boolean {
  const now = Date.now();
  const cached = ipBandwidthCache.get(ip);
  
  if (!cached || now > cached.resetTime) {
    ipBandwidthCache.set(ip, { bytes: estimatedSize, resetTime: now + BANDWIDTH_WINDOW });
    return true;
  }
  
  if (cached.bytes + estimatedSize > BANDWIDTH_LIMIT) {
    return false;
  }
  
  cached.bytes += estimatedSize;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nama file tidak valid." });
  }

  const authResult = await verifyAuth(req, res);
  const isAuthenticated = authResult.authenticated;
  const userId = authResult.userId;

  const clientIP = isAuthenticated ? `authenticated-${userId}` : 
                   (req.headers['x-forwarded-for'] as string || 
                    req.headers['x-real-ip'] as string || 
                    req.socket.remoteAddress || 'unknown');
  
  if (!isAuthenticated && req.query.download === 'true') {
    return res.status(403).json({ error: "File downloads require authentication." });
  }

  try {
    const imagePath = (storage as any).getImagePath(name);
    const stats = await fs.stat(imagePath);
    const estimatedSize = stats.size;

    if (!checkBandwidthQuota(clientIP, estimatedSize)) {
      res.setHeader('Retry-After', '3600');
      return res.status(429).json({ 
        error: "Bandwidth limit exceeded. Please try again later or login for unlimited access." 
      });
    }

    const fileBuffer = await fs.readFile(imagePath);
    
    if (isAuthenticated) {
      res.setHeader('Cache-Control', 'private, max-age=86400, s-maxage=604800, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    }
    
    res.setHeader('Content-Type', 'image/*');
    res.setHeader('Vary', 'Accept-Encoding, Authorization');
    
    if (!isAuthenticated) {
      console.log(`[Public Image] Anonymous access to ${name} from ${clientIP} (${estimatedSize} bytes)`);
    }
    
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(404).json({ error: "Image not found." });
  }
}
