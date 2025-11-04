import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuthCookieName } from "../../lib/auth";

type SuccessResponse = {
  success: true;
};

type ErrorResponse = {
  error: string;
};

const buildExpiredCookieHeader = () => {
  const cookieName = getAdminAuthCookieName();
  const secure = process.env.NODE_ENV === "production";
  const segments = [
    `${cookieName}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
  ];

  if (secure) {
    segments.push("Secure");
  }

  return segments.join("; ");
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  res.setHeader("Set-Cookie", buildExpiredCookieHeader());
  return res.status(200).json({ success: true });
}
