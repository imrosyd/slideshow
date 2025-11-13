import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid video name" });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    if (!supabase) {
      console.warn('[Public Video] Supabase not configured');
      return res.status(500).json({ error: 'Storage not configured' });
    }
    
    // Get public URL directly (no authentication required)
    const { data } = supabase.storage
      .from('slideshow-videos')
      .getPublicUrl(name);

    if (!data?.publicUrl) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Aggressive caching for TV playback
    // Browser cache: 7 days, CDN cache: 30 days
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, immutable');
    res.setHeader('ETag', `"${name}-v1"`);
    
    // Support conditional requests for bandwidth savings
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${name}-v1"`) {
      return res.status(304).end(); // Not Modified
    }

    // Redirect to public URL
    res.redirect(307, data.publicUrl);

  } catch (error) {
    console.error("Public video access error:", error);
    res.status(500).json({ error: "Failed to access video" });
  }
}
