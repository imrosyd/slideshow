import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid video name" });
  }

  // Check authentication - only for private videos
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Verify the token and check if user has video access
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid authentication" });
    }

    // Check if user is admin or has specific video permissions
    const { data: userData } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';
    const hasVideoAccess = userData?.permissions?.includes('video_access');

    if (!isAdmin && !hasVideoAccess) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Create signed URL for private video (shorter expiry for security)
    const { data, error } = await supabase.storage
      .from('slideshow-videos')
      .createSignedUrl(name, 1800); // 30 minutes only

    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Log access for security monitoring
    await supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        resource_type: 'video',
        resource_path: name,
        ip_address: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        success: true
      });

    // Secure cache headers
    res.setHeader('Cache-Control', 'private, max-age=1800'); // 30 minutes
    res.setHeader('Authorization', 'Bearer'); // Remove auth header from response
    res.redirect(307, data.signedUrl);

  } catch (error) {
    console.error("Secure video access error:", error);
    res.status(500).json({ error: "Failed to access video securely" });
  }
}
