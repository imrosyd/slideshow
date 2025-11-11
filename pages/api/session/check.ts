import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/simple-auth";
import { getActiveSession, createOrUpdateSession, updateLastSeen } from "../../../lib/session-manager";

/**
 * Check and create session for authenticated user
 * Enforces strict single session - only 1 device/browser allowed
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

  const { page, sessionId, browserId } = req.body as { 
    page?: "admin" | "remote"; 
    sessionId?: string;
    browserId?: string;
  };
  
  if (!page || !["admin", "remote"].includes(page)) {
    return res.status(400).json({ error: "Invalid page parameter" });
  }

  try {
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId parameter" });
    }
    
    // Use browser ID or generate fallback
    const browserIdToUse = browserId || `unknown-${Date.now()}`;
    
    // Create or update session with browser ID
    const result = await createOrUpdateSession(
      auth.userId,
      auth.email || "unknown",
      page,
      sessionId,
      browserIdToUse,
      false // Don't force new (just update if exists)
    );
    
    // Check if there's a session conflict with another browser
    if (result.conflict) {
      console.log(`[Session Check] Conflict: Another browser is active for ${auth.email}`);
      return res.status(403).json({
        error: "concurrent_session",
        message: "Another browser has logged in. You have been logged out.",
        activeUser: result.existingSession?.email || auth.email,
        activePage: result.existingSession?.page,
      });
    }
    
    if (!result.success) {
      return res.status(403).json({
        error: "session_creation_failed",
        message: result.message,
      });
    }
    
    // Success - update last seen
    await updateLastSeen(auth.userId);
    
    return res.status(200).json({
      success: true,
      userId: auth.userId,
      email: auth.email,
      page: page,
    });
    
  } catch (error) {
    console.error("[Session Check] Error:", error);
    return res.status(500).json({ error: "Session check failed" });
  }
}
