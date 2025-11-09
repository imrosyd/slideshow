import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedAdminRequest } from "../../lib/auth";

type VideoUpdatePayload = {
  slideName: string;
  videoUrl: string;
  videoDurationSeconds?: number;
  action: "created" | "deleted" | "updated";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional auth check if required
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = req.body as VideoUpdatePayload;
    
    // Broadcast to all connected main page clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const channel = supabase.channel('video-updates');
    
    await channel.send({
      type: 'broadcast',
      event: 'video-updated',
      payload
    }, { httpSend: true });

    console.log(`[Broadcast] Video update broadcasted:`, payload);

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('[Broadcast] Error broadcasting:', error);
    res.status(500).json({ error: 'Failed to broadcast video update' });
  }
}
