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
    
    // Fetch complete metadata including hidden flags
    const { data: allDbMetadata, error: dbError } = await supabaseServiceRole
      .from("image_durations")
      .select("*")
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

    // Build image data including visibility status
    const imageData = allDbMetadata.map((item: any) => ({
      name: item.filename,
      isVideo: item.is_video || false,
      hidden: item.hidden || false,
      videoUrl: item.video_url,
    }));

    console.log(`[Remote Images] ${imageData.length} total entries returned`);
    console.log(`[Remote Images] Hidden items: ${imageData.filter(item => item.hidden).length}`);
    console.log(`[Remote Images] Video items: ${imageData.filter(item => item.isVideo).length}`);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).json({ images: imageData });
    
  } catch (error: any) {
    console.error("[Remote Images] Error:", error);
    res.status(500).json({ error: error.message || "Unable to read image list" });
  }
}
