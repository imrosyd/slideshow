import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { getActiveSession } from "../../../lib/session-manager";

/**
 * Create a login attempt and wait for approval from active session
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, email, browserId, browserInfo } = req.body;

  if (!userId || !email || !browserId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Check if there's an active session
    const activeSession = await getActiveSession();
    
    if (!activeSession) {
      // No active session, can proceed with login
      return res.status(200).json({ 
        status: "no_conflict",
        message: "No active session, proceed with login" 
      });
    }
    
    // Check if it's the same browser
    if ((activeSession as any).browser_id === browserId) {
      // Same browser, allow
      return res.status(200).json({ 
        status: "same_browser",
        message: "Same browser detected, proceed" 
      });
    }
    
    // Different browser - create login attempt
    const { data: attempt, error } = await supabase
      .from("login_attempts" as any)
      .insert({
        user_id: userId,
        email: email,
        browser_id: browserId,
        browser_info: browserInfo || "Unknown browser",
        status: "pending",
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes
      })
      .select()
      .single();
    
    if (error) {
      console.error("[Login Attempt] Error creating attempt:", error);
      return res.status(500).json({ error: "Failed to create login attempt" });
    }
    
    // Return attempt ID for polling
    return res.status(200).json({
      status: "pending",
      attemptId: (attempt as any).id,
      message: "Waiting for approval from active session"
    });
    
  } catch (error) {
    console.error("[Login Attempt] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
