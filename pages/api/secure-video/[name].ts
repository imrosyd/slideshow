import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../lib/storage-adapter";
import { requireAuth } from "../../../lib/simple-auth";
import fs from 'fs/promises';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid video name" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const videoPath = (storage as any).getVideoPath(name);
    const fileBuffer = await fs.readFile(videoPath);

    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Type', 'video/mp4');
    res.send(fileBuffer);

  } catch (error) {
    console.error("Secure video access error:", error);
    res.status(404).json({ error: "Video not found" });
  }
}
