import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";

type Data =
  | { images: Array<{name: string; url: string}> }
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
    
    // Fetch all non-video images for the gallery
    const { data: allDbMetadata, error: dbError } = await supabaseServiceRole
      .from("image_durations")
      .select("*")
      .eq('is_video', false) // Only get regular images, not videos
      .eq('hidden', false) // Only get visible images
      .neq('filename', 'dashboard.jpg') // Exclude dashboard.jpg placeholder
      .order('order_index', { ascending: true });

    if (dbError) {
      console.error("[Gallery Images] Database error:", dbError);
      throw new Error("Failed to load image metadata from database.");
    }

    if (!allDbMetadata) {
      res.status(200).json({ images: [] });
      return;
    }

    console.log(`[Gallery Images] Loaded ${allDbMetadata.length} images for gallery`);

    // Build image data with Supabase public URLs
    const imageData = allDbMetadata
      .map((item: any) => ({
        name: item.filename,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-images/${item.filename}`
      }));

    console.log(`[Gallery Images] ${imageData.length} images returned for gallery`);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).json({ images: imageData });
    
  } catch (error: any) {
    console.error("[Gallery Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
