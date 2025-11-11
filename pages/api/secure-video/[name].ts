import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { requireAuth } from "../../../lib/simple-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid video name" });
  }

  // Simple auth check - just verify user is logged in
  const auth = await requireAuth(req, res);
  if (!auth) return; // Already sent 401 response

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Create signed URL for video
    const { data, error } = await supabase.storage
      .from('slideshow-videos')
      .createSignedUrl(name, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Cache headers for authenticated users
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour
    res.redirect(307, data.signedUrl);

  } catch (error) {
    console.error("Secure video access error:", error);
    res.status(500).json({ error: "Failed to access video securely" });
  }
}
