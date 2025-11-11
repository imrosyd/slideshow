import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/simple-auth";
import { clearSession } from "../../../lib/session-manager";

/**
 * Logout and clear session
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
    // Clear session
    await clearSession(auth.userId);
    
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("[Logout] Error:", error);
    return res.status(500).json({ error: "Logout failed" });
  }
}
