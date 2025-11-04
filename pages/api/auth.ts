import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuthCookieName, getExpectedAdminToken } from "../../lib/auth";

type SuccessResponse = {
  success: true;
  token: string;
};

type ErrorResponse = {
  error: string;
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

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah." });
  }

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: "Kata sandi salah." });
  }

  const token = getExpectedAdminToken(adminPassword);
  res.setHeader("Set-Cookie", buildCookieHeader(token));
  return res.status(200).json({ success: true, token });
}
