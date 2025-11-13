import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "./supabase";

/**
 * Simple authentication check for admin and remote pages
 * No role checks, no permissions - just verify user is logged in
 * Ultra-lightweight for bandwidth savings
 */
export async function verifyAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ authenticated: boolean; userId?: string; email?: string }> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // If Supabase is not configured, skip authentication
    if (!supabase) {
      console.warn('[Auth] Supabase not configured - authentication disabled');
      return {
        authenticated: true,
        userId: 'default-user',
        email: 'admin@localhost',
      };
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { authenticated: false };
  }
}

/**
 * Middleware wrapper for protected API routes
 * Usage:
 * 
 * export default async function handler(req, res) {
 *   const auth = await requireAuth(req, res);
 *   if (!auth) return; // Already sent 401 response
 *   
 *   // Your protected route logic here
 * }
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ userId: string; email?: string } | null> {
  const result = await verifyAuth(req, res);

  if (!result.authenticated) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  return {
    userId: result.userId!,
    email: result.email,
  };
}
