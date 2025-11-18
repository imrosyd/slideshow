import type { NextApiRequest, NextApiResponse } from "next";
import jwt from 'jsonwebtoken';

export async function verifyAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ authenticated: boolean; userId?: string; email?: string, role?: string }> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret') as { userId: string, email: string, role: string };
    return {
      authenticated: true,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { authenticated: false };
  }
}

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
