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
  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

  if (!SUPABASE_STORAGE_BUCKET) {
    throw new Error("SUPABASE_STORAGE_BUCKET is not set.");
  }

  const supabaseServiceRole = getSupabaseServiceRoleClient();
  
  // List files from storage
  const { data: storageFiles, error: storageError } = await supabaseServiceRole.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (storageError) {
    console.error("Error listing files from Supabase Storage:", storageError);
    throw new Error("Failed to list images from Supabase Storage.");
  }

  // Load metadata from database
  // Query ALL images first to build hiddenSet, then filter for durations
  let allDbMetadata: any[] | null = null;
  let dbError: any = null;

  // Query all images to know which are hidden
  const result = await supabaseServiceRole
    .from('image_durations')
    .select('*')
    .order('order_index', { ascending: true });

  if (result.error) {
    console.error("[Images API] Database error:", result.error);
    dbError = result.error;
  } else {
    allDbMetadata = result.data;
  }

  if (dbError) {
    throw new Error("Failed to load metadata from database.");
  }

  console.log(`[Images API] Loaded ${allDbMetadata?.length || 0} total images from database`);

  // Create lookup maps
  const durationMap: Record<string, number | null> = {};
  const captionMap: Record<string, string | null> = {};
  const hiddenSet = new Set<string>();
  const orderMap: Record<string, number> = {};
  const videoMap: Record<string, { isVideo: boolean; videoUrl?: string }> = {};

  if (allDbMetadata) {
    allDbMetadata.forEach((row) => {
      // Only add non-hidden images to duration/caption maps
      if (!row.hidden) {
        durationMap[row.filename] = row.duration_ms;
        captionMap[row.filename] = row.caption;
      }
      
      // Add to hiddenSet if hidden
      if (row.hidden !== undefined && row.hidden) {
        hiddenSet.add(row.filename);
      }
      
      // Track order for all images
      if (row.order_index !== undefined) {
        orderMap[row.filename] = row.order_index;
      }

      // Track video info
      if (row.is_video) {
        videoMap[row.filename] = {
          isVideo: true,
          videoUrl: row.video_url,
        };
      }
    });
  }

  // Filter and map storage files
  let names = storageFiles
    .filter((file) => {
      if (file.id === null) return false;
      
      const extension = path.extname(file.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(extension)) return false;
      
      // Filter out hidden images (double check from DB)
      if (hiddenSet.has(file.name)) {
        console.log(`[Images API] Filtering out hidden image: ${file.name}`);
        return false;
      }
      
      return true;
    })
    .map((file) => file.name);

  // Add video-only entries from database (entries with is_video=true even if image is hidden)
  if (allDbMetadata) {
    allDbMetadata.forEach((row) => {
      // If this is a video entry and the image file is hidden, add it directly
      if (row.is_video && row.hidden && row.video_url) {
        console.log(`[Images API] Adding video-only entry: ${row.filename} -> ${row.video_url}`);
        
        // Only add if not already in names (avoid duplicates)
        if (!names.includes(row.filename)) {
          names.push(row.filename);
        }
        
        // Add to maps so it can be processed
        durationMap[row.filename] = row.duration_ms;
        captionMap[row.filename] = row.caption;
        orderMap[row.filename] = row.order_index ?? 999999;
        
        // Make sure videoMap has this entry
        if (!videoMap[row.filename]) {
          videoMap[row.filename] = {
            isVideo: true,
            videoUrl: row.video_url,
          };
        }
      }
    });
  }

  // Sort by order_index from database
  names.sort((a, b) => {
    const orderA = orderMap[a] ?? 999999;
    const orderB = orderMap[b] ?? 999999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // If same order or both not in DB, sort alphabetically
    return a.localeCompare(b);
  });

  // Build image data with video info
  const imageData = names.map((name) => ({
    name,
    isVideo: videoMap[name]?.isVideo || false,
    videoUrl: videoMap[name]?.videoUrl,
  }));

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
