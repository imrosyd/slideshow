import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";
import fs from 'fs';
import path from 'path';

type Data =
  | { images: Array<{name: string; url: string}> }
  | { error: string };

// Rate limiting for public gallery
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cached = ipCache.get(ip);
  
  if (!cached || now > cached.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (cached.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  cached.count++;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting for public access
  const clientIP = req.headers['x-forwarded-for'] as string || 
                   req.headers['x-real-ip'] as string || 
                   req.socket.remoteAddress || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: "Too many requests. Please try again in 1 minute." });
  }

  try {
    // First, get all entries to debug
    const allEntries = await db.getImageDurations();
    
    console.log(`[Gallery Images] Total entries in DB: ${allEntries?.length || 0}`);
    if (allEntries && allEntries.length > 0) {
      console.log(`[Gallery Images] Sample entries:`, allEntries.slice(0, 5));
      console.log(`[Gallery Images] Hidden entries: ${allEntries.filter((e: any) => e.hidden).length}`);
      console.log(`[Gallery Images] Video entries: ${allEntries.filter((e: any) => e.is_video).length}`);
    }
    
    // Fetch metadata from local database
    const allDbMetadata = allEntries;

    if (!allDbMetadata) {
      console.error("[Gallery Images] Database error: No data returned");
      throw new Error("Failed to load image metadata from database.");
    }

    if (!allDbMetadata || allDbMetadata.length === 0) {
      console.log("[Gallery Images] No data found in database");
      res.status(200).json({ images: [] });
      return;
    }

    console.log(`[Gallery Images] Loaded ${allDbMetadata.length} total entries from database`);

    // Build image data with internal API URLs (serve via Prisma/local storage)
    const imageData = allDbMetadata
      .filter((item: any) => {
        // Skip hidden images
        if (item.hidden === true) {
          console.log(`[Gallery Images] Skipping hidden: ${item.filename}`);
          return false;
        }
        
        // Skip dashboard files
        if (item.filename === 'dashboard.jpg' || 
            item.filename === 'dashboard.png' || 
            item.filename === 'dashboard.mp4') {
          console.log(`[Gallery Images] Skipping dashboard: ${item.filename}`);
          return false;
        }
        
        // Skip video-only entries (is_video true and filename ends with .mp4)
        if (item.is_video === true && item.filename.endsWith('.mp4')) {
          console.log(`[Gallery Images] Skipping video-only: ${item.filename}`);
          return false;
        }
        
        return true;
      })
      .map((item: any) => {
        // For items with .jpg/.png extension, use the image file
        // Even if they have video versions, we want to show the thumbnail from the image
        const filename = item.filename;
        const imageFilename = filename.endsWith('.mp4') 
          ? filename.replace('.mp4', '.jpg') 
          : filename;
        
        return {
          name: item.filename,
          // Use internal API route to serve images (no Supabase)
          url: `/api/storage/images/${encodeURIComponent(imageFilename)}`,
        };
      });

    console.log(`[Gallery Images] ${imageData.length} images returned for gallery`);

    // If no images from database, try to list files from local storage dir
    if (imageData.length === 0) {
      console.log("[Gallery Images] No images from DB, checking local storage directory...");
      try {
        const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage', 'images');
        if (fs.existsSync(storageDir)) {
          const files = fs.readdirSync(storageDir);
          const storageImageData = files
            .filter((filename) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename) && !filename.startsWith('dashboard.'))
            .map((filename) => ({
              name: filename,
              url: `/api/storage/images/${encodeURIComponent(filename)}`,
            }));

          console.log(`[Gallery Images] Returning ${storageImageData.length} images from local storage`);
          res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600"); // 5min browser, 10min CDN
          res.setHeader("ETag", JSON.stringify(storageImageData.map((i: any) => i.name)).slice(0, 32)); // Simple ETag
          return res.status(200).json({ images: storageImageData });
        }
      } catch (err) {
        console.error('[Gallery Images] Error reading local storage directory:', err);
      }
    }

    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600"); // 5min browser, 10min CDN
    res.setHeader("ETag", JSON.stringify(imageData.map((i: any) => i.name)).slice(0, 32)); // Simple ETag
    res.status(200).json({ images: imageData });
    
  } catch (error: any) {
    console.error("[Gallery Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
