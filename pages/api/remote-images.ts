import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";

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
    const supabaseServiceRole = getSupabaseServiceRoleClient();
    
    if (!supabaseServiceRole) {
      console.warn('[Remote Images] Supabase not configured');
      return res.status(200).json({ images: [] });
    }
    
    // Fetch metadata with specific fields only to reduce data transfer
    const { data: allDbMetadata, error: dbError } = await supabaseServiceRole
      .from("image_durations")
      .select("filename, hidden, is_video, caption, video_url, video_duration_seconds, order_index")
      .order('order_index', { ascending: true });

    if (dbError) {
      console.error("[Remote Images] Database error:", dbError);
      throw new Error("Failed to load metadata from database.");
    }

    if (!allDbMetadata) {
      res.status(200).json({ images: [] });
      return;
    }

    console.log(`[Remote Images] Loaded ${allDbMetadata.length} metadata entries from database`);

    // Check if any videos exist
    const hasAnyVideos = allDbMetadata.some((item: any) => item.is_video);

    // Build image data with consistent filtering logic
    const imageData = allDbMetadata
      .filter((item: any) => {
        // If no videos exist, include everything (consistent with images.ts logic for no videos)
        if (!hasAnyVideos) {
          return true;
        }
        
        // Hide merge video placeholders completely (including dashboard.jpg)
        if (item.is_video && item.filename === 'dashboard.jpg') {
          console.log(`[Remote Images] Excluding dashboard placeholder: ${item.filename}`);
          return false;
        }
        
        // Hide merge placeholders that don't have video URLs (these are just placeholder images)
        // But show actual merge videos that have valid video URLs
        if (item.is_video && item.caption && item.caption.includes('Merged:') && !item.video_url) {
          console.log(`[Remote Images] Excluding merge placeholder without video: ${item.filename}`);
          return false;
        }
        
        // When videos exist, show videos that have URLs (still available)
        if (item.is_video) {
          // Only include videos that have valid URLs
          if (item.video_url && item.video_url.trim() !== '') {
            console.log(`[Remote Images] Including video in slideshow: ${item.filename} (hidden: ${item.hidden || false})`);
            return true;
          } else {
            console.log(`[Remote Images] Excluding deleted video (no URL): ${item.filename}`);
            return false;
          }
        }
        
        // Exclude regular images when videos exist (slideshow mode)
        console.log(`[Remote Images] Excluding regular image (videos exist): ${item.filename}`);
        return false;
      })
      .map((item: any) => ({
        name: item.filename,
        isVideo: item.is_video || false,
        hidden: item.hidden || false, // Preserve original hidden status
        videoUrl: item.is_video 
          ? `/api/public-video/${encodeURIComponent(item.filename)}` // Public video with aggressive caching
          : item.video_url,
        videoDurationSeconds: item.video_duration_seconds,
        requiresAuth: false, // Videos are now public for TV playback
      }));

    console.log(`[Remote Images] ${imageData.length} total entries returned`);
    console.log(`[Remote Images] Hidden items: ${imageData.filter(item => item.hidden).length}`);
    console.log(`[Remote Images] Video items: ${imageData.filter(item => item.isVideo).length}`);
    console.log(`[Remote Images] Video URL list:`, imageData.filter(item => item.isVideo).map(item => ({name: item.name, url: item.videoUrl})));

    res.setHeader("Cache-Control", "public, max-age=180, s-maxage=300"); // 3min browser, 5min CDN
    res.setHeader("ETag", JSON.stringify(imageData.map(i => i.name)).slice(0, 32)); // Simple ETag
    res.status(200).json({ images: imageData });
    
  } catch (error: any) {
    console.error("[Remote Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
