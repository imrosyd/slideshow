import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import path from "path"; // Keep path for extension checking

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif"
]);

type Data =
  | { images: string[] }
  | { error: string };

async function readImageList(): Promise<string[]> {
  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

  if (!SUPABASE_STORAGE_BUCKET) {
    throw new Error("SUPABASE_STORAGE_BUCKET is not set.");
  }

  const supabaseServiceRole = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRole.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    console.error("Error listing files from Supabase Storage:", error);
    throw new Error("Failed to list images from Supabase Storage.");
  }

  return data
    .filter((file) => {
      // Supabase list() returns files and folders, filter for files
      if (file.id === null) return false; // This indicates a folder

      const extension = path.extname(file.name).toLowerCase();
      return IMAGE_EXTENSIONS.has(extension);
    })
    .map((file) => file.name)
    .sort((a, b) => a.localeCompare(b));
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const images = await readImageList();

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.status(200).json({ images: images.slice() });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ error: error.message || "Unable to read image list." });
}
}
