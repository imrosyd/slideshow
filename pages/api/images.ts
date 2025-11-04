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
  | { images: string[]; durations?: Record<string, number | null>; captions?: Record<string, string | null> }
  | { error: string };

async function readImageList(): Promise<{ names: string[]; durations: Record<string, number | null>; captions: Record<string, string | null> }> {
  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
  const SUPABASE_DURATIONS_TABLE = process.env.SUPABASE_DURATIONS_TABLE;

  if (!SUPABASE_STORAGE_BUCKET) {
    throw new Error("SUPABASE_STORAGE_BUCKET is not set.");
  }
  if (!SUPABASE_DURATIONS_TABLE) {
    throw new Error("SUPABASE_DURATIONS_TABLE is not set.");
  }

  const supabaseServiceRole = getSupabaseServiceRoleClient();
  const [{ data, error }, { data: metadata, error: metadataError }] = await Promise.all([
    supabaseServiceRole.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    }),
    supabaseServiceRole
      .from(SUPABASE_DURATIONS_TABLE as 'image_durations')
      .select('filename, duration_ms, caption'),
  ]);

  if (error) {
    console.error("Error listing files from Supabase Storage:", error);
    throw new Error("Failed to list images from Supabase Storage.");
  }
  if (metadataError) {
    console.error("Error fetching metadata from Supabase:", metadataError);
    throw new Error("Failed to fetch metadata from Supabase.");
  }

  const durationMap: Record<string, number | null> = {};
  const captionMap: Record<string, string | null> = {};
  (metadata ?? []).forEach((row) => {
    let duration: number | null = null;
    if (typeof row.duration_ms === "number") {
      duration = row.duration_ms;
    } else if (typeof row.duration_ms === "string") {
      const parsed = Number(row.duration_ms);
      duration = Number.isNaN(parsed) ? null : parsed;
    }
    durationMap[row.filename] = duration;
    captionMap[row.filename] = row.caption ?? null;
  });

  const names = data
    .filter((file) => {
      // Supabase list() returns files and folders, filter for files
      if (file.id === null) return false; // This indicates a folder

      const extension = path.extname(file.name).toLowerCase();
      return IMAGE_EXTENSIONS.has(extension);
    })
    .map((file) => file.name)
    .sort((a, b) => a.localeCompare(b));

  return { names, durations: durationMap, captions: captionMap };
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const { names, durations, captions } = await readImageList();

    console.log("[Images API] Returning durations:", Object.keys(durations).length, "items");
    console.log("[Images API] Sample duration:", Object.entries(durations)[0]);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).json({ images: names.slice(), durations, captions });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ error: error.message || "Unable to read image list." });
}
}
