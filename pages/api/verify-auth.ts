import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuthCookieName, getExpectedAdminToken, isAuthorizedAdminRequest } from "../../lib/auth";

type SuccessResponse = {
  success: true;
  token: string;
};

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  try {
    // Check if user is authenticated via cookie
    if (!isAuthorizedAdminRequest(req)) {
      return res.status(401).json({ error: "Akses ditolak." });
    }

    // If authenticated, return the expected token for client-side use
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
      return res.status(500).json({ error: "Konfigurasi server salah." });
    }

    const token = getExpectedAdminToken(adminPassword);
    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error("Error in verify-auth:", error);
    return res.status(500).json({ error: "Terjadi kesalahan server." });
  }
}
