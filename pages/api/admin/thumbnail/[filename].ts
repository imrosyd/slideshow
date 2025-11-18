import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import { storage } from "../../../../lib/storage-adapter";
import { isAuthorizedAdminRequest } from "../../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { filename, isVideo } = req.query;
  if (!filename || typeof filename !== "string") {
    return res.status(400).json({ error: "Filename is required" });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isVideoRequest = isVideo === "true";

  try {
    let filePath: string;
    if (isVideoRequest) {
      filePath = (storage as any).getVideoPath(filename);
    } else {
      filePath = (storage as any).getImagePath(filename);
    }

    const fileBuffer = await fs.readFile(filePath);
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(fileBuffer);

  } catch (error: any) {
    console.error(`[Thumbnail] Error creating thumbnail for ${filename}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
