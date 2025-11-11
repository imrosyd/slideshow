import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuthCookieName, getExpectedAdminToken } from "../../lib/auth";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import { createOrUpdateSession, getActiveSession } from "../../lib/session-manager";

type SuccessResponse = {
  success: true;
  token: string;
  supabaseToken: string;
  sessionId: string;
};

type ErrorResponse = {
  error: string;
  details?: string;
  existingSession?: any;
  attemptId?: string;
};

const buildCookieHeader = (token: string) => {
  const secure = process.env.NODE_ENV === "production";
  const cookieName = getAdminAuthCookieName();
  const parts = [
    `${cookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=604800",
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  const { password, browserId, forceLogin } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah." });
  }

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: "Kata sandi salah." });
  }

  try {
    // Get default admin email from env or use default
    const adminEmail = process.env.ADMIN_EMAIL || "admin@slideshow.local";
    
    // Create/login Supabase user for admin
    const supabase = getSupabaseServiceRoleClient();
    
    // Try to sign in or create user
    let authResult = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    // If user doesn't exist, create it
    if (authResult.error && authResult.error.message.includes("Invalid login")) {
      console.log("[Auth] Admin user not found, creating...");
      const signUpResult = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (signUpResult.error) {
        console.error("[Auth] Failed to create admin user:", signUpResult.error);
        return res.status(500).json({ 
          error: "Gagal membuat user admin.", 
          details: signUpResult.error.message 
        });
      }

      // Sign in with newly created user
      authResult = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
    }

    if (authResult.error || !authResult.data.session) {
      console.error("[Auth] Supabase auth error:", authResult.error);
      return res.status(500).json({ 
        error: "Gagal autentikasi dengan Supabase.", 
        details: authResult.error?.message 
      });
    }

    const { session, user } = authResult.data;
    
    // Generate unique session ID for this login
    const sessionId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Use browser ID or generate a fallback
    const browserIdToUse = browserId || `server-${Date.now()}`;
    
    // DISABLED: Approval dialog feature (BUG - not working properly)
    // For now, just force new login and clear old sessions
    // TODO: Fix approval dialog in future version
    
    // No conflict or forced login - create/update session
    console.log(`[Auth] Creating session for ${user.email || adminEmail}, forceLogin: ${forceLogin}`);
    const sessionResult = await createOrUpdateSession(
      user.id,
      user.email || adminEmail,
      "admin",
      sessionId,
      browserIdToUse,
      true // Always force to ensure single device
    );
    
    if (!sessionResult.success) {
      console.error("[Auth] Session creation failed:", sessionResult.message);
      // Continue anyway - cookie auth will work
    }

    // Set cookie for backward compatibility
    const cookieToken = getExpectedAdminToken(adminPassword);
    res.setHeader("Set-Cookie", buildCookieHeader(cookieToken));
    
    return res.status(200).json({ 
      success: true, 
      token: cookieToken,
      supabaseToken: session.access_token,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error("[Auth] Unexpected error:", error);
    return res.status(500).json({ 
      error: "Terjadi kesalahan saat login.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
