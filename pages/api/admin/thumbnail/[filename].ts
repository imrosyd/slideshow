import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
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

  const { filename, isVideo } = req.query;
  if (!filename || typeof filename !== "string") {
    return res.status(400).json({ error: "Filename is required" });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if request is for video thumbnail
  const isVideoRequest = isVideo === "true";

  try {
    const supabaseServiceRole = getSupabaseServiceRoleClient();
    let filePath: string;
    let fileBuffer: Buffer | undefined;

    // Special handling for video: get metadata and create thumbnail
    if (isVideoRequest) {
      // Extract video duration metadata from database
      const { data: imageData, error } = await (supabaseServiceRole as any)
        .from('image_durations')
        .eq('filename', filename)
        .single();

      if (error) {
        console.error(`[Thumbnail] Error fetching metadata for ${filename}:`, error);
        return res.status(500).json({ error: error.message });
      }

      if (imageData) {
        fileBuffer = Buffer.from(imageData.videoBlob || '');
        filePath = `/tmp/thumbnail-${filename}.jpg`;
        // Copy to Supabase using public URL
        try {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-videos/${filename}`;
          const response = await fetch(publicUrl, { cache: 'no-store' });
          const buffer = await response.arrayBuffer();
          await fs.writeFile(filePath, Buffer.from(buffer));
          return res.status(200).json({ success: true });
        } catch (err) {
          console.error('[Thumbnail] Error copying from Supabase:', err);
          if (filePath) await fs.rm(filePath);
          return res.status(500).json({ error: `Failed to copy image: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }
    } else {
      // Regular image file
      const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-images/${filename}`;
      const response = await fetch(fileUrl, { cache: 'no-store' });
      if (!response.ok) {
        console.error(`[Thumbnail] Error: Failed to load image: ${response.statusText}`);
        return res.status(500).json({ error: `Failed to load image: ${response.statusText}` });
      }
      const buffer = await response.arrayBuffer();
      await fs.writeFile(`/tmp/thumbnail-${filename}.jpg`, Buffer.from(buffer));
      return res.status(200).json({ success: true });
    }
  } catch (error: any) {
    console.error("[Thumbnail] Error creating thumbnail for ${filename}:", error);
    return res.status(500).json({ error: error.message });
  }
};
