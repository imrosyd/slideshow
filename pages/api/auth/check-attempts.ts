import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/simple-auth";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

/**
 * Check for pending login attempts for the current user
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return; // Already sent 401

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Get pending attempts for this user
    const { data: attempts, error } = await supabase
      .from("login_attempts" as any)
      .select("*")
      .eq("user_id", auth.userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("[Check Attempts] Error:", error);
      return res.status(500).json({ error: "Failed to check login attempts" });
    }
    
    if (!attempts || attempts.length === 0) {
      return res.status(200).json({
        hasPendingAttempt: false
      });
    }
    
    const attempt = attempts[0] as any;
    
    return res.status(200).json({
      hasPendingAttempt: true,
      attempt: {
        id: attempt.id,
        email: attempt.email,
        browserInfo: attempt.browser_info,
        createdAt: attempt.created_at,
        expiresAt: attempt.expires_at
      }
    });
    
  } catch (error) {
    console.error("[Check Attempts] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
