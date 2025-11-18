import { db } from "./db";

/**
 * Strict single-device session management
 * Only 1 device/browser can be logged in at a time
 * New logins automatically logout all other sessions
 */

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export interface ActiveSession {
  id: string;
  user_id: string;
  created_at: string | Date;
  last_seen: string | Date;
  page: "admin" | "remote";
  session_id: string; // Unique ID for each browser/tab
  browser_id?: string | null; // Browser fingerprint to identify same browser
}

/**
 * Check if there's an active session for any user
 */
export async function hasActiveSession(): Promise<boolean> {
  try {
    const sessions = await db.getAllActiveSessions();
    return sessions.length > 0;
  } catch (error) {
    console.error("[Session] Error checking active session:", error);
    return false; // Allow access on error
  }
}

/**
 * Get current active session
 */
export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    const sessions = await db.getAllActiveSessions();
    return sessions.length > 0 ? sessions[0] : null;
  } catch (error) {
    console.error("[Session] Error getting active session:", error);
    return null;
  }
}

/**
 * Create or update session for a user
 * Allows same browser to have both admin and remote sessions
 * Different browsers trigger conflict resolution
 */
export async function createOrUpdateSession(
  userId: string,
  email: string,
  page: "admin" | "remote",
  sessionId: string,
  browserId: string,
  forceNew: boolean = false
): Promise<{ success: boolean; message?: string; conflict?: boolean; existingSession?: any }> {
  try {
    // Check if this exact session already exists
    if (!forceNew) {
      const existingSession = await db.getActiveSessionBySessionId(sessionId);
      
      if (existingSession && existingSession.user_id === userId && existingSession.page === page) {
        // Session already exists, just update last_seen
        await db.updateActiveSession(existingSession.id, {
          last_seen: new Date().toISOString(),
        });
        
        console.log(`[Session] Updated existing session for ${email} on ${page}`);
        return { success: true };
      }
    }
    
    // If forcing new, clear ALL other sessions (strict single device)
    if (forceNew) {
      console.log(`[Session] Force new: Clearing ALL sessions for ${email}`);
      await db.deleteActiveSession(userId);
    } else {
      // Not forcing - check for conflicts
      const existingSessions = await db.getAllActiveSessions();
      const userSessions = existingSessions.filter(s => s.user_id === userId);
      
      // Check if there's a session from a different browser
      const differentBrowserSession = userSessions.find(
        s => s.browser_id && s.browser_id !== browserId
      );
      
      if (differentBrowserSession) {
        // Session conflict - another browser is active
        console.log(`[Session] Conflict detected: ${email} is logged in from another browser`);
        return { 
          success: false, 
          conflict: true,
          message: "Another browser is currently active",
          existingSession: differentBrowserSession
        };
      }
      
      // Same browser - clear sessions for same page from OTHER browsers
      const sessionsToDelete = userSessions.filter(
        s => s.page === page && s.browser_id !== browserId
      );
      
      for (const session of sessionsToDelete) {
        await db.deleteActiveSession(session.user_id);
      }
    }
    
    // Create new session with sessionId and browserId (DB does not store email)
    await db.createActiveSession({
      user_id: userId,
      last_seen: new Date().toISOString(),
      page: page,
      session_id: sessionId,
      browser_id: browserId,
    });
    
    console.log(`[Session] Created new session for ${email} on ${page} with sessionId ${sessionId}`);
    return { success: true };
  } catch (error) {
    console.error("[Session] Error in createOrUpdateSession:", error);
    return { success: false, message: "Session management error" };
  }
}

/**
 * Update last seen timestamp for user
 */
export async function updateLastSeen(userId: string): Promise<void> {
  try {
    const session = await db.getActiveSessionByUserId(userId);
    if (session) {
      await db.updateActiveSession(session.id, {
        last_seen: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[Session] Error updating last seen:", error);
  }
}

/**
 * Clear session for a user (logout)
 */
export async function clearSession(userId: string): Promise<void> {
  try {
    await db.deleteActiveSession(userId);
    console.log("[Session] Cleared session for user:", userId);
  } catch (error) {
    console.error("[Session] Error clearing session:", error);
  }
}

/**
 * Force clear all sessions (admin override)
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await db.deleteAllActiveSessions();
    console.log("[Session] Cleared all sessions");
  } catch (error) {
    console.error("[Session] Error clearing all sessions:", error);
  }
}

/**
 * Cleanup stale sessions (older than SESSION_TIMEOUT)
 */
export async function cleanupStaleSessions(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT);
    await db.deleteStaleActiveSessions(cutoff);
    console.log("[Session] Cleaned up stale sessions");
  } catch (error) {
    console.error("[Session] Error cleaning up stale sessions:", error);
  }
}
