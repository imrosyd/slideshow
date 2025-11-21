import type { NextApiRequest, NextApiResponse } from "next";
import { db, ImageDuration } from "../../lib/db";
import { storage } from '../../lib/storage-adapter';

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
    // Step 1: Get all image files from storage as the source of truth
    const physicalImageFiles = await storage.listImages();
    console.log(`[Gallery Images] Found ${physicalImageFiles.length} physical files in storage.`);

    // Step 2: Fetch all image metadata from the database
    const allDbMetadata = await db.getImageDurations();
    console.log(`[Gallery Images] Fetched ${allDbMetadata.length} metadata entries from DB.`);

    // Step 3: Create a lookup map for the metadata
    const metadataMap = new Map<string, ImageDuration>();
    allDbMetadata.forEach(meta => metadataMap.set(meta.filename, meta));

    // Step 4 & 5: Iterate physical files, check metadata, and filter
    const imageData = physicalImageFiles
      .map(filename => {
        // The name for lookup can be the filename itself
        const name = filename;
        const metadata = metadataMap.get(name);

        // If metadata exists for a .mp4 file, it's a video entry. We might want to represent it with a .jpg thumbnail.
        const isVideo = metadata?.is_video || name.endsWith('.mp4');
        const representativeFilename = isVideo ? name.replace(/\.mp4$/, '.jpg') : name;
        
        // If the representative file isn't in our physical list (e.g., DB has video entry but no JPG thumbnail), skip it.
        if (isVideo && !physicalImageFiles.includes(representativeFilename)) {
          console.log(`[Gallery Images] Skipping video entry '${name}' because its thumbnail '${representativeFilename}' is missing.`);
          return null;
        }

        return {
          name: name, // The original name (can be .mp4)
          url: storage.getImageUrl(representativeFilename),
          metadata: metadata,
        };
      })
      .filter((imageInfo): imageInfo is NonNullable<typeof imageInfo> => {
        if (!imageInfo) return false;

        const { name, metadata } = imageInfo;

        // Skip hidden images
        if (metadata?.hidden === true) {
          console.log(`[Gallery Images] Skipping hidden: ${name}`);
          return false;
        }
        
        // Skip dashboard files
        if (name.startsWith('dashboard.')) {
          console.log(`[Gallery Images] Skipping dashboard: ${name}`);
          return false;
        }

        // We only want to show images in the gallery, not video placeholders
        if (name.endsWith('.mp4')) {
            console.log(`[Gallery Images] Skipping video placeholder: ${name}`);
            return false;
        }
        
        return true;
      })
      .map(({ name, url }) => ({ name, url }));

    console.log(`[Gallery Images] Returning ${imageData.length} images for gallery.`);

    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600"); // 5min browser, 10min CDN
    res.setHeader("ETag", `W/"${imageData.length}-${Date.now()}"`); // Simple ETag
    res.status(200).json({ images: imageData });
    
  } catch (error: any) {
    console.error("[Gallery Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
