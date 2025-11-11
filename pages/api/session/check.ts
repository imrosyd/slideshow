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

  const { page } = req.body as { page?: "admin" | "remote" };
  
  if (!page || !["admin", "remote"].includes(page)) {
    return res.status(400).json({ error: "Invalid page parameter" });
  }

  try {
    // Get session ID from request body (to identify specific browser/tab)
    const { sessionId } = req.body as { page?: "admin" | "remote"; sessionId?: string };
    
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId parameter" });
    }
    
    // Check for existing sessions first
    const activeSession = await getActiveSession();
    
    if (activeSession) {
      // Check if this is the same session
      const isSameSession = 
        activeSession.user_id === auth.userId && 
        activeSession.page === page &&
        (activeSession as any).session_id === sessionId;
      
      if (!isSameSession) {
        // Different session detected - this user/device has been logged out
        console.log(`[Session Check] Different session detected. Active: ${activeSession.email} on ${activeSession.page}, Current: ${auth.email} on ${page}`);
        return res.status(403).json({
          error: "concurrent_session",
          message: "Another device has logged in. You have been logged out.",
          activeUser: activeSession.email,
          activePage: activeSession.page,
        });
      }
    }
    
    // Create or update session for this user with sessionId
    const result = await createOrUpdateSession(
      auth.userId,
      auth.email || "unknown",
      page,
      sessionId,
      false // Don't force new (just update if exists)
    );
    
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
