import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

/**
 * Check status of a login attempt
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { attemptId } = req.query;

  if (!attemptId || typeof attemptId !== "string") {
    return res.status(400).json({ error: "Missing attemptId" });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Get attempt status
    const { data: attempt, error } = await supabase
      .from("login_attempts" as any)
      .select("*")
      .eq("id", attemptId)
      .single();
    
    if (error || !attempt) {
      return res.status(404).json({ error: "Login attempt not found" });
    }
    
    const attemptData = attempt as any;
    
    // Check if expired
    if (new Date(attemptData.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from("login_attempts" as any)
        .update({ status: "expired" })
        .eq("id", attemptId);
      
      return res.status(200).json({
        status: "expired",
        message: "Login attempt has expired"
      });
    }
    
    return res.status(200).json({
      status: attemptData.status,
      message: attemptData.status === "approved" ? "Login approved" : 
               attemptData.status === "denied" ? "Login denied" : 
               "Waiting for approval"
    });
    
  } catch (error) {
    console.error("[Attempt Status] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
