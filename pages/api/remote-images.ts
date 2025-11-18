import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

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

    const hasAnyVideos = allDbMetadata.some((item: any) => item.is_video);

    const imageData = allDbMetadata
      .filter((item: any) => {
        if (!hasAnyVideos) {
          return true;
        }
        
        if (item.is_video && item.filename === 'dashboard.jpg') {
          return false;
        }
        
        if (item.is_video && item.caption && item.caption.includes('Merged:') && !item.video_url) {
          return false;
        }
        
        if (item.is_video) {
          if (item.video_url && item.video_url.trim() !== '') {
            return true;
          } else {
            return false;
          }
        }
        
        return false;
      })
      .map((item: any) => ({
        name: item.filename,
        isVideo: item.is_video || false,
        hidden: item.hidden || false,
        videoUrl: item.is_video 
          ? `/api/public-video/${encodeURIComponent(item.filename)}`
          : item.video_url,
        videoDurationSeconds: item.video_duration_ms ? Math.round(item.video_duration_ms / 1000) : null,
        requiresAuth: false,
      }));

    res.setHeader("Cache-Control", "public, max-age=180, s-maxage=300");
    res.setHeader("ETag", JSON.stringify(imageData.map(i => i.name)).slice(0, 32));
    res.status(200).json({ images: imageData as any[] });
    
  } catch (error: any) {
    console.error("[Remote Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
