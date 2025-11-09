import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { filename } = req.query.filename as string;
  
  try {
    // Get metadata for this specific video
    const { data, error } = await supabaseAdminClient
      .from('image_durations')
      .eq('filename', filename)
      .single();

    if (error) {
      console.error(`[Video Duration] Database error for ${filename}:`, error);
      return res.status(500).json({ error: error.message });
    }

    if (data && data.videoDurationSeconds) {
      return res.status(200).json({ 
        duration: data.videoDurationSeconds
      });
    } else {
      return res.status(200).json({ 
        duration: null
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
