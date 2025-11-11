import { getSupabaseServiceRoleClient } from "./supabase";

/**
 * Strict single-device session management
 * Only 1 device/browser can be logged in at a time
 * New logins automatically logout all other sessions
 */

const SESSION_TABLE = "active_sessions";
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export interface ActiveSession {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  last_seen: string;
  page: "admin" | "remote";
  session_id: string; // Unique ID for each browser/tab
  browser_id?: string; // Browser fingerprint to identify same browser
}

/**
 * Check if there's an active session for any user
 */
export async function hasActiveSession(): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Check if sessions table exists, if not return false (no sessions tracked)
    const { data: sessions, error } = await supabase
      .from(SESSION_TABLE as any)
      .select("id")
      .limit(1);
    
    if (error) {
      // Table doesn't exist yet, no sessions
      console.log("[Session] No sessions table, allowing access");
      return false;
    }
    
    return (sessions && sessions.length > 0);
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
    const supabase = getSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from(SESSION_TABLE as any)
      .select("*")
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as unknown as ActiveSession;
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
    const supabase = getSupabaseServiceRoleClient();
    
    // Check if this exact session already exists
    if (!forceNew) {
      const { data: existingSession, error: queryError } = await supabase
        .from(SESSION_TABLE as any)
        .select("*")
        .eq("user_id", userId)
        .eq("page", page)
        .eq("session_id", sessionId)
        .single();
      
      if (!queryError && existingSession) {
        // Session already exists, just update last_seen
        await supabase
          .from(SESSION_TABLE as any)
          .update({ last_seen: new Date().toISOString() })
          .eq("id", (existingSession as any).id);
        
        console.log(`[Session] Updated existing session for ${email} on ${page}`);
        return { success: true };
      }
    }
    
    // If forcing new, clear ALL other sessions (strict single device)
    if (forceNew) {
      console.log(`[Session] Force new: Clearing ALL sessions for ${email}`);
      await supabase
        .from(SESSION_TABLE as any)
        .delete()
        .eq("user_id", userId);
    } else {
      // Not forcing - check for conflicts
      const { data: existingSessions } = await supabase
        .from(SESSION_TABLE as any)
        .select("*")
        .eq("user_id", userId);
      
      // Check if there's a session from a different browser
      const differentBrowserSession = existingSessions?.find(
        (s: any) => s.browser_id && s.browser_id !== browserId
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
      await supabase
        .from(SESSION_TABLE as any)
        .delete()
        .eq("user_id", userId)
        .eq("page", page)
        .neq("browser_id", browserId);
    }
    
    // Create new session with sessionId and browserId
    const { error } = await supabase.from(SESSION_TABLE as any).insert({
      user_id: userId,
      email: email,
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      page: page,
      session_id: sessionId,
      browser_id: browserId,
    });
    
    if (error) {
      console.error("[Session] Error creating session:", error);
      return { success: false, message: "Failed to create session" };
    }
    
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
    const supabase = getSupabaseServiceRoleClient();
    
    await supabase
      .from(SESSION_TABLE as any)
      .update({ last_seen: new Date().toISOString() })
      .eq("user_id", userId);
  } catch (error) {
    console.error("[Session] Error updating last seen:", error);
  }
}

/**
 * Clear session for a user (logout)
 */
export async function clearSession(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    await supabase
      .from(SESSION_TABLE as any)
      .delete()
      .eq("user_id", userId);
    
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
    const supabase = getSupabaseServiceRoleClient();
    
    await supabase
      .from(SESSION_TABLE as any)
      .delete()
      .neq("id", "dummy"); // Delete all
    
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
    const supabase = getSupabaseServiceRoleClient();
    
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT).toISOString();
    
    await supabase
      .from(SESSION_TABLE as any)
      .delete()
      .lt("last_seen", cutoff);
    
    console.log("[Session] Cleaned up stale sessions");
  } catch (error) {
    console.error("[Session] Error cleaning up stale sessions:", error);
  }
}
