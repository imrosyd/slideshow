import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import path from "path";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif"
]);

type Data =
  | { images: Array<{ name: string; isVideo?: boolean; videoUrl?: string }>; durations?: Record<string, number | null>; captions?: Record<string, string | null> }
  | { error: string };

async function readImageList(): Promise<{ 
  imageData: Array<{ name: string; isVideo: boolean; videoUrl?: string }>; 
  durations: Record<string, number | null>; 
  captions: Record<string, string | null> 
}> {
  const supabaseServiceRole = getSupabaseServiceRoleClient();
  
  // The database is the single source of truth.
  const { data: allDbMetadata, error: dbError } = await supabaseServiceRole
    .from('image_durations')
    .select('*')
    .order('order_index', { ascending: true });

  if (dbError) {
    console.error("[Images API] Database error:", dbError);
    throw new Error("Failed to load metadata from database.");
  }

  if (!allDbMetadata) {
    return { imageData: [], durations: {}, captions: {} };
  }

  console.log(`[Images API] Loaded ${allDbMetadata.length} total metadata entries from database`);

  // Create complete lookup maps for all items in the DB.
  const durationMap: Record<string, number | null> = {};
  const captionMap: Record<string, string | null> = {};
  const videoMap: Record<string, { isVideo: boolean; videoUrl?: string }> = {};

  // Cast to any to access dynamic columns like is_video
  (allDbMetadata as any[]).forEach((row) => {
    durationMap[row.filename] = row.duration_ms;
    captionMap[row.filename] = row.caption;
    if (row.is_video && row.video_url) {
      console.log(`[Images API] Adding to videoMap: ${row.filename} -> ${row.video_url}`);
      videoMap[row.filename] = {
        isVideo: true,
        videoUrl: row.video_url,
      };
    }
  });

  // Filter the metadata list based on NEW slideshow logic.
  const visibleItems = (allDbMetadata as any[]).filter(item => {
    // NEW LOGIC: 
    // 1. If ANY video exists -> show ONLY videos (no regular images)
    // 2. If NO videos exist -> show NOTHING (blank)
    const hasAnyVideos = (allDbMetadata as any[]).some(i => i.is_video);
    
    if (!hasAnyVideos) {
      console.log(`[Images API] No videos found - blank slideshow`);
      return false; // Exclude everything for blank slideshow
    }
    
    // Only show videos when videos exist
    if (!item.is_video) {
      console.log(`[Images API] Filtering out regular image (videos exist): ${item.filename}`);
      return false;
    }
    
    // Show ALL videos (including hidden ones from batch merge)
    // Previously we were excluding hidden videos, but we want to show them
    console.log(`[Images API] Including video in slideshow: ${item.filename} (hidden: ${item.hidden || false})`);
    return true;
  });

  console.log(`[Images API] ${visibleItems.length} items are visible for the slideshow.`);

  // Build image data for the client.
  const imageData = visibleItems.map((item) => {
    const result = {
      name: item.filename,
      isVideo: videoMap[item.filename]?.isVideo || false,
      videoUrl: videoMap[item.filename]?.videoUrl,
      videoDurationSeconds: item.video_duration_seconds || undefined,
    };
    console.log(`[Images API] Item ${item.filename}:`, result);
    return result;
  });

  return { imageData, durations: durationMap, captions: captionMap };
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const { imageData, durations, captions } = await readImageList();

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).json({ images: imageData, durations, captions });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ error: error.message || "Unable to read image list." });
}
}
