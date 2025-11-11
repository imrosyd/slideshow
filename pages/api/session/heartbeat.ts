import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/simple-auth";
import { updateLastSeen } from "../../../lib/session-manager";

/**
 * Update session heartbeat to keep session alive
 * Called periodically from client
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return; // Already sent 401

  try {
    // Update last seen timestamp
    await updateLastSeen(auth.userId);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Heartbeat] Error:", error);
    return res.status(500).json({ error: "Heartbeat failed" });
  }
}
