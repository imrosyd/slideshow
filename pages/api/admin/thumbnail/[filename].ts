import { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { filename } = req.query;
  if (!filename || typeof filename !== "string") {
    return res.status(400).json({ error: "Filename is required" });
  }

  const { video: isVideo } = req.query;
  const isVideoRequest = isVideo === "true";

  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD is not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();

    if (isVideoRequest) {
      // Return a placeholder for videos that don't have image files
      const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#f8fafc">
          🔗 ${decodeURIComponent(filename).replace(/\.[^/.]+$/, "")}
        </text>
        <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">
          Merged Video File
        </text>
        <polygon points="800,480 900,540 800,600" fill="#ef4444"/>
      </svg>`;
      
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(svg);
    } else {
      // Regular image - download from storage and return
      const { data, error } = await supabase.storage
        .from("slideshow-images")
        .download(filename);

      if (error || !data) {
        return res.status(404).json({ error: "Image not found" });
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      
      // Determine content type
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentType = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'avif': 'image/avif'
      }[ext || ''] || 'image/jpeg';

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(buffer);
    }
  } catch (error) {
    console.error("Error in thumbnail API:", error);
    return res.status(500).json({ error: "Failed to generate thumbnail" });
  }
}
