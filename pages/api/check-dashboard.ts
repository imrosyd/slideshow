import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";
import { storage } from "../../lib/storage-adapter";
import fs from 'fs/promises';

type Data = {
  exists: boolean;
  videoUrl?: string;
  videoGeneratedAt?: string;
  lastChecked?: string;
  error?: string;
  cachebuster?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ 
      exists: false,
      error: "Method not allowed" 
    });
  }

  try {
    const videoEntry = await db.getImageDurationByFilename("dashboard.mp4");

    const exists = !!(videoEntry && videoEntry.video_url && videoEntry.video_url.trim() !== '');
    
    let fileExists = false;
    if (exists) {
      try {
        const videoPath = (storage as any).getVideoPath("dashboard.mp4");
        await fs.access(videoPath);
        fileExists = true;
      } catch (error) {
        fileExists = false;
        await db.updateImageDuration("dashboard.mp4", {
          video_url: null,
          video_duration_ms: null,
        });
        console.log("[Check Dashboard] Cleared invalid video_url for non-existent file");
      }
    }

    console.log(`[Check Dashboard] Dashboard.mp4 status: exists=${videoEntry?.is_video || false}, hasUrl=${videoEntry?.video_url || null}, fileExists=${fileExists}`);
    
    const videoUrlWithCacheBust = fileExists && videoEntry?.video_url 
      ? `${videoEntry.video_url}?_cache=${Date.now()}` 
      : undefined;
    
    return res.status(200).json({
      exists: fileExists && (!!(videoEntry?.is_video)),
      videoUrl: videoUrlWithCacheBust,
      videoGeneratedAt: videoEntry?.created_at?.toString(),
      lastChecked: new Date().toISOString(),
      cachebuster: Date.now()
    });
  } catch (error: any) {
    console.error("[Check Dashboard] Error:", error);
    return res.status(500).json({ 
      exists: false,
      error: "Internal server error" 
    });
  }
}
