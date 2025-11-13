import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

// Bandwidth quota tracking for public images
const ipBandwidthCache = new Map<string, { bytes: number; resetTime: number }>();
const BANDWIDTH_LIMIT = 50 * 1024 * 1024; // 50MB per hour per IP
const BANDWIDTH_WINDOW = 60 * 60 * 1000; // 1 hour

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

  // Check if user is authenticated (bypass rate limiting)
  const authHeader = req.headers.authorization;
  let isAuthenticated = false;
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const supabaseClient = getSupabaseServiceRoleClient();
      if (supabaseClient) {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
      
        if (!authError && user) {
          isAuthenticated = true;
          userId = user.id;
        }
      }
    } catch (error) {
      // Auth failed - continue as anonymous with rate limiting
    }
  }

  // If authenticated, skip rate limiting
  const clientIP = isAuthenticated ? `authenticated-${userId}` : 
                   (req.headers['x-forwarded-for'] as string || 
                    req.headers['x-real-ip'] as string || 
                    req.socket.remoteAddress || 'unknown');
  
  // Only enforce download limits for anonymous users
  if (!isAuthenticated && req.query.download === 'true') {
    return res.status(403).json({ error: "File downloads require authentication." });
  }

  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

  if (!SUPABASE_STORAGE_BUCKET) {
    console.error("SUPABASE_STORAGE_BUCKET is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
  }

  try {
    // Get file metadata for bandwidth estimation
    const supabaseServiceRole = getSupabaseServiceRoleClient();
    
    if (!supabaseServiceRole) {
      console.warn('[Image API] Supabase not configured - cannot serve images');
      return res.status(500).json({ error: 'Storage not configured' });
    }
    
    const { data: fileMetadata } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .list('', { search: name });

    // Estimate file size from metadata or use reasonable default
    const estimatedSize = fileMetadata?.[0]?.metadata?.size || 
                         (name.includes('.mp4') ? 10 * 1024 * 1024 : 500 * 1024); // 10MB video, 500KB image

    // Check bandwidth quota
    if (!checkBandwidthQuota(clientIP, estimatedSize)) {
      res.setHeader('Retry-After', '3600');
      return res.status(429).json({ 
        error: "Bandwidth limit exceeded. Please try again later or login for unlimited access." 
      });
    }

    // Get the public URL for the image (with bandwidth-aware caching)
    const { data, error } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(name, 3600); // link valid for 1 hour (3600 seconds)

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL for image:", error);
      return res.status(404).json({ error: "Image not found in Supabase Storage." });
    }

    // Set headers based on authentication status
    if (isAuthenticated) {
      // Authenticated users get longer cache
      res.setHeader('Cache-Control', 'private, max-age=86400, s-maxage=604800, immutable'); // 1 day
    } else {
      // Public users get shorter cache to respect bandwidth limits
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200'); // 1 hour browser, 2 hours CDN
    }
    
    res.setHeader('Content-Type', 'image/*');
    res.setHeader('Vary', 'Accept-Encoding, Authorization');
    
    // Log bandwidth usage for monitoring
    if (!isAuthenticated) {
      console.log(`[Public Image] Anonymous access to ${name} from ${clientIP} (${estimatedSize} bytes)`);
    }
    
    // Redirect to the signed URL
    res.redirect(307, data.signedUrl);
  } catch (error) {
    console.error("Error fetching image from Supabase:", error);
    res.status(500).json({ error: "Failed to fetch image from Supabase Storage." });
  }
}
