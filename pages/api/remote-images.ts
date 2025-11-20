import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";
import { storage } from "../../lib/storage-adapter";
import fs from 'fs/promises';
import computeFileHash from '../../lib/file-hash';

type Data =
  | { images: Array<{name: string; isVideo?: boolean; hidden?: boolean}> }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const allDbMetadata = await db.getImageDurations();

    if (!allDbMetadata) {
      res.status(200).json({ images: [] });
      return;
    }

    const imageData = [] as any[];

    const hasAnyVideos = allDbMetadata.some((item: any) => item.is_video);

    for (const item of allDbMetadata) {
      try {
        // Derive expected mp4 filename if the source is a PDF/image entry
        const videoFilename = item.filename.replace(/\.[^/.]+$/, '.mp4');
        const videoPath = (storage as any).getVideoPath(videoFilename);

        let videoUrl: string | undefined = undefined;
        let videoHash: string | null = null;

        try {
          await fs.stat(videoPath);
          // Prefer stable `/storage` public URL mapping for direct static serving
          const rawUrl = storage.getVideoUrl(videoFilename);
          videoUrl = rawUrl.replace('/api/storage', '/storage');
          // Prefer DB-stored hash if available, otherwise compute
          if (item.video_hash) {
            videoHash = item.video_hash;
          } else {
            try {
              videoHash = await computeFileHash(videoPath);
            } catch (e) {
              console.warn('[remote-images] failed to compute hash for', videoPath, e);
              videoHash = null;
            }
          }
        } catch {
          // file doesn't exist in storage; fall back to DB-provided URL/hash
          videoUrl = item.video_url || undefined;
          videoHash = item.video_hash ?? null;
        }

        const include = (() => {
          if (!hasAnyVideos) return true;
          if (item.is_video && item.filename === 'dashboard.jpg') return false;
          if (item.is_video && item.caption && item.caption.includes('Merged:') && !item.video_url) return false;
          if (item.is_video) return Boolean(item.video_url || videoUrl);
          return false;
        })();

        if (!include) continue;

        imageData.push({
          name: item.filename,
          isVideo: item.is_video || false,
          hidden: item.hidden || false,
          videoUrl: videoUrl,
          videoHash: videoHash,
          videoDurationSeconds: item.video_duration_ms ? Math.round(item.video_duration_ms / 1000) : null,
          requiresAuth: false,
        });
      } catch (e) {
        console.error('[remote-images] error building item', item.filename, e);
      }
    }

    res.setHeader("Cache-Control", "public, max-age=180, s-maxage=300");
    res.setHeader("ETag", JSON.stringify(imageData.map(i => i.name)).slice(0, 32));
    res.status(200).json({ images: imageData as any[] });
    
  } catch (error: any) {
    console.error("[Remote Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
