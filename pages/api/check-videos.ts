import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import { db } from "../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Skip if Supabase is not configured
    if (!supabase) {
      console.warn('[check-videos] Supabase not configured - using database adapter');
      const allData = await db.getImageDurations();
      
      const videos = allData.filter((item: any) => item.is_video);
      const nonVideos = allData.filter((item: any) => !item.is_video);
      
      return res.status(200).json({
        total: allData.length,
        videos: videos.map((v: any) => ({
          filename: v.filename,
          is_video: v.is_video,
          video_url: v.video_url,
          video_duration_ms: v.video_duration_ms,
          hasVideoUrl: !!v.video_url
        })),
        nonVideos: nonVideos.length,
        sampleRecord: videos.length > 0 ? videos[0] : null,
        summary: {
          hasVideos: videos.length > 0,
          visibleInSlideshow: videos.length > 0 ? videos.length : nonVideos.length > 0 ? 0 : 'blank'
        }
      });
    }
    
    // Get all records with video info
    const { data: allData, error } = await supabase
      .from('image_durations')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Check specifically for videos
    const videos = allData.filter((item: any) => item.is_video);
    const nonVideos = allData.filter((item: any) => !item.is_video);
    
    const result = {
      total: allData.length,
      videos: videos.map((v: any) => ({
        filename: v.filename,
        is_video: v.is_video,
        video_url: v.video_url,
        video_generated_at: v.video_generated_at,
        video_duration_seconds: v.video_duration_seconds,
        hasVideoUrl: !!v.video_url
      })),
      nonVideos: nonVideos.length,
      sampleRecord: videos.length > 0 ? videos[0] : null,
      summary: {
        hasVideos: videos.length > 0,
        visibleInSlideshow: videos.length > 0 ? videos.length : nonVideos.length > 0 ? 0 : 'blank'
      }
    };
    
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
