import { getSupabaseServiceRoleClient } from "./supabase";

/**
 * Multi-device session management
 * Allows multiple devices to be logged in simultaneously
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
 * Allows multiple concurrent sessions across different devices
 */
export async function createOrUpdateSession(
  userId: string,
  email: string,
  page: "admin" | "remote",
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Check if this exact session already exists (same user, page, and sessionId)
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
    
    // Create new session with sessionId (allow multiple concurrent sessions)
    const { error } = await supabase.from(SESSION_TABLE as any).insert({
      user_id: userId,
      email: email,
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      page: page,
      session_id: sessionId,
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
