import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import path from "path";

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

const METADATA_FILE = "metadata.json";

type ImageMetadata = {
  filename: string;
  duration_ms: number;
  caption?: string;
  order?: number;
};

type MetadataStore = {
  images: Record<string, ImageMetadata>;
  order?: string[];
  updated_at: string;
};

type Data =
  | { images: string[]; durations?: Record<string, number | null>; captions?: Record<string, string | null> }
  | { error: string };

async function readImageList(): Promise<{ names: string[]; durations: Record<string, number | null>; captions: Record<string, string | null> }> {
  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

  if (!SUPABASE_STORAGE_BUCKET) {
    throw new Error("SUPABASE_STORAGE_BUCKET is not set.");
  }

  const supabaseServiceRole = getSupabaseServiceRoleClient();
  
  // List files from storage
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

  // Load metadata from JSON file
  const durationMap: Record<string, number | null> = {};
  const captionMap: Record<string, string | null> = {};
  let imageOrder: string[] = [];
  
  const { data: metadataFile } = await supabaseServiceRole.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .download(METADATA_FILE);

  if (metadataFile) {
    try {
      const text = await metadataFile.text();
      const metadata: MetadataStore = JSON.parse(text);
      
      // Get order from metadata
      imageOrder = metadata.order || [];
      
      Object.values(metadata.images).forEach((img) => {
        durationMap[img.filename] = img.duration_ms;
        captionMap[img.filename] = img.caption ?? null;
      });
      
      console.log(`[Images API] Loaded ${Object.keys(durationMap).length} metadata entries, order: ${imageOrder.length} items`);
    } catch (err) {
      console.error("[Images API] Failed to parse metadata.json:", err);
    }
  } else {
    console.log("[Images API] No metadata.json found");
  }

  let names = data
    .filter((file) => {
      if (file.id === null) return false;
      if (file.name === METADATA_FILE) return false;

      const extension = path.extname(file.name).toLowerCase();
      return IMAGE_EXTENSIONS.has(extension);
    })
    .map((file) => file.name);

  // Sort based on saved order
  if (imageOrder.length > 0) {
    names.sort((a, b) => {
      const orderA = imageOrder.indexOf(a);
      const orderB = imageOrder.indexOf(b);
      
      // If both are in order, sort by their position
      if (orderA !== -1 && orderB !== -1) {
        return orderA - orderB;
      }
      
      // Items not in order go to the end (sorted alphabetically)
      if (orderA === -1 && orderB === -1) {
        return a.localeCompare(b);
      }
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      
      return 0;
    });
    console.log("[Images API] Sorted images based on saved order");
  } else {
    names.sort((a, b) => a.localeCompare(b));
  }

  console.log(`[Images API] Returning ${names.length} images with ${Object.keys(durationMap).length} durations`);

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
