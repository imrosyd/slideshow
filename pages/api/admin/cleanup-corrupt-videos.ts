import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import https from "https";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type CleanupResult = {
  checked: number;
  deleted: number;
  kept: number;
  deletedEntries: string[];
  keptEntries: string[];
};

// Function to check if video URL is accessible
function checkVideoUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume(); // Drain the response
    });
    
    request.on('error', () => {
      resolve(false);
    });
    
    // Set timeout to avoid hanging
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupResult | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log('[Cleanup] Starting corrupt video cleanup...');
    
    // Get all video entries that are hidden (placeholder images)
    const { data: videos, error: fetchError } = await supabase
      .from('image_durations')
      .select('*')
      .eq('is_video', true)
      .eq('hidden', true);

    if (fetchError) {
      console.error('[Cleanup] Database fetch error:', fetchError);
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    if (!videos || videos.length === 0) {
      console.log('[Cleanup] No hidden video entries found');
      return res.status(200).json({
        checked: 0,
        deleted: 0,
        kept: 0,
        deletedEntries: [],
        keptEntries: [],
      });
    }

    console.log(`[Cleanup] Found ${videos.length} hidden video entries`);

    const toDelete: string[] = [];
    const toKeep: string[] = [];

    // Check each video URL
    for (const video of videos) {
      const videoUrl = video.video_url;
      console.log(`[Cleanup] Checking ${video.filename}: ${videoUrl}`);

      const isAccessible = await checkVideoUrl(videoUrl);

      if (isAccessible) {
        console.log(`[Cleanup] ✅ ${video.filename} - accessible`);
        toKeep.push(video.filename);
      } else {
        console.log(`[Cleanup] ❌ ${video.filename} - NOT accessible`);
        toDelete.push(video.filename);
      }
    }

    console.log(`[Cleanup] Summary: ${toKeep.length} to keep, ${toDelete.length} to delete`);

    // Delete corrupt video entries
    if (toDelete.length > 0) {
      console.log('[Cleanup] Deleting corrupt entries...');
      
      for (const filename of toDelete) {
        const { error: deleteError } = await supabase
          .from('image_durations')
          .delete()
          .eq('filename', filename);

        if (deleteError) {
          console.error(`[Cleanup] Error deleting ${filename}:`, deleteError);
        } else {
          console.log(`[Cleanup] ✅ Deleted ${filename}`);
        }
      }
    }

    const result: CleanupResult = {
      checked: videos.length,
      deleted: toDelete.length,
      kept: toKeep.length,
      deletedEntries: toDelete,
      keptEntries: toKeep,
    };

    console.log('[Cleanup] Cleanup complete:', result);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return res.status(500).json({ 
      error: error.message || "Cleanup failed" 
    });
  }
}
