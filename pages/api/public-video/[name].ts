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
    const stat = await fs.stat(videoPath);
    // Content-derived ETag: the fixed filename (e.g. dashboard.mp4) gets
    // overwritten in place, so the tag must change with mtime/size or a
    // browser/CDN cache would keep serving the old video forever.
    const etag = `"${name}-${stat.mtimeMs}-${stat.size}"`;

    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    const fileBuffer = await fs.readFile(videoPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.send(fileBuffer);

  } catch (error) {
    console.error("Public video access error:", error);
    res.status(404).json({ error: "Video not found" });
  }
}
