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

  if (!SUPABASE_DURATIONS_TABLE) {
    console.error("SUPABASE_DURATIONS_TABLE is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Nama tabel durasi tidak diatur." });
  }

  try {
    const supabaseServiceRole = getSupabaseServiceRoleClient();

    const metadataQuery = async () => {
      const primary = await supabaseServiceRole
        .from(SUPABASE_DURATIONS_TABLE)
        .select("filename, duration_ms, caption");

      if (!primary.error) {
        return { data: primary.data ?? [], supportsCaption: true as const };
      }

      const errorMessage = primary.error?.message?.toLowerCase() ?? "";
      if (!errorMessage.includes("column") || !errorMessage.includes("caption")) {
        throw primary.error;
      }

      const fallback = await supabaseServiceRole
        .from(SUPABASE_DURATIONS_TABLE)
        .select("filename, duration_ms");

      if (fallback.error) {
        throw fallback.error;
      }

      return {
        data: (fallback.data ?? []).map((row: any) => ({ ...row, caption: null })),
        supportsCaption: false as const,
      };
    };

    const [{ data: fileList, error: storageError }, metadataResult] = await Promise.all([
      supabaseServiceRole.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } }),
      metadataQuery(),
    ]);

    const metadata = metadataResult.data;

    if (storageError) {
      console.error("Error listing files from Supabase Storage:", storageError);
      return res.status(500).json({ error: "Gagal membaca daftar file dari Supabase Storage." });
    }

    const metadataMap = new Map<string, { duration_ms: number | null; caption: string | null }>();
    (metadata ?? []).forEach((row: any) => {
      let duration: number | null = null;
      if (typeof row.duration_ms === "number") {
        duration = row.duration_ms;
      } else if (typeof row.duration_ms === "string") {
        const parsed = Number(row.duration_ms);
        duration = Number.isNaN(parsed) ? null : parsed;
      }
      metadataMap.set(row.filename, {
        duration_ms: duration,
        caption: row.caption ?? null
      });
    });

    const images: AdminImage[] = (fileList ?? [])
      .filter((file) => file.name && file.name !== "" && file.id && isImageFile(file.name))
      .map((file) => {
        const metadataEntry = metadataMap.get(file.name) || null;
        const durationMs = metadataEntry?.duration_ms ?? null;
        return {
          name: file.name,
          size: file.metadata?.size ?? file.size ?? 0,
          createdAt: file.created_at ?? null,
          updatedAt: file.updated_at ?? null,
          durationMs,
          caption: metadataEntry?.caption ?? null,
        };
      });

    return res.status(200).json({ images });
  } catch (error) {
    console.error("Error in GET /api/admin/images:", error);
    return res.status(500).json({ error: "Gagal memuat data admin." });
  }
}
