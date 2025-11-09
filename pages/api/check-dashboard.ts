import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if dashboard.mp4 video exists in database
    const { data: videoEntry } = await supabase
      .from("image_durations")
      .select("filename, is_video, video_url, video_generated_at")
      .eq("filename", "dashboard.mp4")
      .single();

    const exists = !!(videoEntry && videoEntry.video_url && videoEntry.video_url.trim() !== '');
    
    // Also check if the video file actually exists (this is a basic check)
    let fileExists = false;
    if (exists) {
      try {
        const response = await fetch(videoEntry.video_url, { method: "HEAD" });
        fileExists = response.ok;
        
        if (!fileExists) {
          // Clear the video_url if file doesn't exist
          await supabase
            .from("image_durations")
            .update({
              video_url: null,
              video_generated_at: null,
              video_duration_seconds: null
            })
            .eq("filename", "dashboard.mp4");
          console.log("[Check Dashboard] Cleared invalid video_url for non-existent file");
        }
      } catch (error) {
        // File doesn't exist or network error
        fileExists = false;
        
        // Clear the video_url if file doesn't exist
        await supabase
          .from("image_durations")
          .update({
            video_url: null,
            video_generated_at: null,
            video_duration_seconds: null
          })
          .eq("filename", "dashboard.mp4");
        console.log("[Check Dashboard] Cleared invalid video_url for non-existent file (catch)");
      }
    }

    console.log(`[Check Dashboard] Dashboard.mp4 status: exists=${videoEntry?.is_video || false}, hasUrl=${videoEntry?.video_url || null}, fileExists=${fileExists}`);
    
    // Add cache-busting parameter if video exists to force refresh
    const videoUrlWithCacheBust = fileExists && videoEntry?.video_url 
      ? `${videoEntry.video_url}?_cache=${Date.now()}` 
      : undefined;
    
    return res.status(200).json({
      exists: fileExists && (!!(videoEntry?.is_video)),
      videoUrl: videoUrlWithCacheBust,
      videoGeneratedAt: videoEntry?.video_generated_at,
      lastChecked: new Date().toISOString(),
      cachebuster: Date.now() // Include timestamp for tracking
    });
  } catch (error: any) {
    console.error("[Check Dashboard] Error:", error);
    return res.status(500).json({ 
      exists: false,
      error: "Internal server error" 
    });
  }
}
