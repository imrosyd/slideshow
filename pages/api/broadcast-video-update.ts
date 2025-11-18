import type { NextApiRequest, NextApiResponse } from "next";
import { isAuthorizedAdminRequest } from "../../lib/auth";
import { broadcast } from "../../lib/websocket";

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
    broadcast(JSON.stringify({ event: 'video-updated', payload }));

    console.log(`[Broadcast] Video update broadcasted:`, payload);

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('[Broadcast] Error broadcasting:', error);
    res.status(500).json({ error: 'Failed to broadcast video update' });
  }
}
