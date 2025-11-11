import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/simple-auth";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

/**
 * Respond to a login attempt (approve or deny)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return; // Already sent 401

  const { attemptId, decision } = req.body;

  if (!attemptId || !decision || !["approve", "deny"].includes(decision)) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Update attempt status
    const { data: attempt, error } = await supabase
      .from("login_attempts" as any)
      .update({
        status: decision === "approve" ? "approved" : "denied",
        responded_at: new Date().toISOString()
      })
      .eq("id", attemptId)
      .eq("user_id", auth.userId) // Ensure it's for the same user
      .select()
      .single();
    
    if (error || !attempt) {
      return res.status(404).json({ error: "Login attempt not found" });
    }
    
    if (decision === "approve") {
      // Clear current session to allow new login
      const { error: deleteError } = await supabase
        .from("active_sessions" as any)
        .delete()
        .eq("user_id", auth.userId);
      
      if (deleteError) {
        console.error("[Respond Attempt] Error clearing session:", deleteError);
      }
    }
    
    return res.status(200).json({
      success: true,
      decision: decision,
      message: decision === "approve" ? 
        "Login approved. Your session will end now." : 
        "Login denied. You remain logged in."
    });
    
  } catch (error) {
    console.error("[Respond Attempt] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
