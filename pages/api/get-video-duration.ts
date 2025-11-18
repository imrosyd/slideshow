import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const filename = req.query.filename as string;
  
  try {
    const data = await db.getImageDurationByFilename(filename);

    if (data && data.video_duration_ms) {
      return res.status(200).json({ 
        duration: Math.round(data.video_duration_ms / 1000)
      });
    } else {
      return res.status(200).json({ 
        duration: null
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
