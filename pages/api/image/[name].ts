import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nama file tidak valid." });
  }

  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

  if (!SUPABASE_STORAGE_BUCKET) {
    console.error("SUPABASE_STORAGE_BUCKET is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
  }

  try {
    // Get the public URL for the image
    const supabaseServiceRole = getSupabaseServiceRoleClient();
    const { data, error } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(name, 60); // link valid for 60 seconds

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL for image:", error);
      return res.status(404).json({ error: "Image not found in Supabase Storage." });
    }

    // Redirect to the signed URL
    res.redirect(307, data.signedUrl);
  } catch (error) {
    console.error("Error fetching image from Supabase:", error);
    res.status(500).json({ error: "Failed to fetch image from Supabase Storage." });
  }
}
