import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../lib/storage-adapter";
import fs from 'fs/promises';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid video name" });
  }

  try {
    const videoPath = (storage as any).getVideoPath(name);
    const fileBuffer = await fs.readFile(videoPath);

    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, immutable');
    res.setHeader('ETag', `"${name}-v1"`);
    
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${name}-v1"`) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.send(fileBuffer);

  } catch (error) {
    console.error("Public video access error:", error);
    res.status(404).json({ error: "Video not found" });
  }
}
