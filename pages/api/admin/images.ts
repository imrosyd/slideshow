import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../lib/auth";

type AdminImage = {
  name: string;
  size: number;
  createdAt: string | null;
  updatedAt: string | null;
  durationMs: number | null;
  caption: string | null;
};

type Data =
  | { images: AdminImage[] }
  | { error: string };

type ImageMetadata = {
  filename: string;
  duration_ms: number;
  caption?: string;
};

type MetadataStore = {
  images: Record<string, ImageMetadata>;
  updated_at: string;
};

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif",
]);

const isImageFile = (filename: string) => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return false;
  }
  const extension = filename.slice(lastDot).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
};

const METADATA_FILE = "metadata.json";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah: ADMIN_PASSWORD tidak diatur." });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
  const SUPABASE_DURATIONS_TABLE = process.env.SUPABASE_DURATIONS_TABLE;

  if (!SUPABASE_STORAGE_BUCKET) {
    console.error("SUPABASE_STORAGE_BUCKET is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
  }

  try {
    const supabaseServiceRole = getSupabaseServiceRoleClient();

    // Load metadata from JSON file
    const metadataMap = new Map<string, { duration_ms: number; caption: string | null }>();
    
    const { data: metadataFile } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .download(METADATA_FILE);

    if (metadataFile) {
      try {
        const text = await metadataFile.text();
        const metadata: MetadataStore = JSON.parse(text);
        
        Object.values(metadata.images).forEach((img) => {
          metadataMap.set(img.filename, {
            duration_ms: img.duration_ms,
            caption: img.caption ?? null,
          });
        });
        
        console.log(`[Admin Images] Loaded ${metadataMap.size} metadata entries from JSON`);
      } catch (err) {
        console.error("[Admin Images] Failed to parse metadata.json:", err);
      }
    } else {
      console.log("[Admin Images] No metadata.json found");
    }

    // List files from storage
    const { data: fileList, error: storageError } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (storageError) {
      console.error("Error listing files from Supabase Storage:", storageError);
      return res.status(500).json({ error: "Gagal membaca daftar file dari Supabase Storage." });
    }

    const images: AdminImage[] = (fileList ?? [])
      .filter((file) => file.name && file.name !== "" && file.id && file.name !== METADATA_FILE && isImageFile(file.name))
      .map((file) => {
        const metadataEntry = metadataMap.get(file.name) || null;
        const durationMs = metadataEntry?.duration_ms ?? null;
        return {
          name: file.name,
          size: file.metadata?.size ?? 0,
          createdAt: file.created_at ?? null,
          updatedAt: file.updated_at ?? null,
          durationMs,
          caption: metadataEntry?.caption ?? null,
        };
      });

    console.log("[Admin Images] Total images returned:", images.length);
    console.log("[Admin Images] Images with duration:", images.filter(i => i.durationMs !== null).length);

    return res.status(200).json({ images });
  } catch (error) {
    console.error("Error in GET /api/admin/images:", error);
    return res.status(500).json({ error: "Gagal memuat data admin." });
  }
}
