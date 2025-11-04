import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../lib/auth";
import { Database } from "../../../lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MetadataPayload = {
  filename: string;
  durationMs: number | null;
  caption?: string | null;
};

type Data =
  | { metadata: MetadataPayload[] }
  | { success: true }
  | { error: string };

const normalizePayload = (payload: any): MetadataPayload[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item) => typeof item?.filename === "string")
      .map((item) => ({
        filename: item.filename,
        durationMs:
          typeof item.durationMs === "number"
            ? item.durationMs
            : typeof item.duration_ms === "number"
              ? item.duration_ms
              : null,
        caption:
          typeof item.caption === "string"
            ? item.caption
            : item.caption === null
              ? null
              : undefined,
      }));
  }

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.keys(payload).length > 0
  ) {
    return Object.entries(payload).map(([filename, value]) => {
      if (typeof value === "number") {
        return { filename, durationMs: value, caption: undefined };
      }
      if (typeof value === "object" && value !== null) {
        const duration =
          typeof (value as any).durationMs === "number"
            ? (value as any).durationMs
            : typeof (value as any).duration_ms === "number"
              ? (value as any).duration_ms
              : typeof (value as any).duration === "number"
                ? (value as any).duration
                : null;
        const caption =
          typeof (value as any).caption === "string"
            ? (value as any).caption
            : undefined;
        return { filename, durationMs: duration, caption };
      }
      return { filename, durationMs: null, caption: undefined };
    });
  }

  return [];
};

const upsertMetadata = async (
  supabase: SupabaseClient<Database>,
  tableName: string,
  payloads: MetadataPayload[],
  includeCaption: boolean
) => {
  if (!payloads.length) {
    return { error: null };
  }

  const rows = payloads.map((item) => ({
    filename: item.filename,
    duration_ms: item.durationMs ?? null,
    ...(includeCaption ? { caption: item.caption ?? null } : {}),
  }));

  return supabase.from(tableName).upsert(rows, { onConflict: "filename" });
};

const clearMissingRows = async (
  supabase: SupabaseClient<Database>,
  tableName: string,
  keepFilenames: string[]
) => {
  if (!keepFilenames.length) {
    return supabase
      .from(tableName)
      .delete()
      .neq("filename", ""); // delete all rows
  }

  const uniqueNames = Array.from(new Set(keepFilenames));

  const escapedNames = uniqueNames.map((name) =>
    `'${name.replace(/'/g, "''")}'`
  );

  const { error } = await supabase
    .from(tableName)
    .delete()
    .not("filename", "in", `(${escapedNames.join(",")})`);

  return { error };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const SUPABASE_DURATIONS_TABLE = process.env.SUPABASE_DURATIONS_TABLE;

  if (!SUPABASE_DURATIONS_TABLE) {
    console.error("SUPABASE_DURATIONS_TABLE is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Nama tabel durasi tidak diatur." });
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah: ADMIN_PASSWORD tidak diatur." });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  const supabaseServiceRole = getSupabaseServiceRoleClient();

  const detectCaptionSupport = async () => {
    const probe = await supabaseServiceRole
      .from(SUPABASE_DURATIONS_TABLE)
      .select("filename, duration_ms, caption")
      .limit(1);

    if (!probe.error) {
      return { supportsCaption: true as const, data: probe.data ?? [] };
    }

    const message = probe.error?.message?.toLowerCase() ?? "";
    if (!message.includes("column") || !message.includes("caption")) {
      throw probe.error;
    }

    const fallback = await supabaseServiceRole
      .from(SUPABASE_DURATIONS_TABLE)
      .select("filename, duration_ms")
      .limit(1);

    if (fallback.error) {
      throw fallback.error;
    }

    return { supportsCaption: false as const, data: fallback.data ?? [] };
  };

  let cachedSupportsCaption: boolean | null = null;

  const ensureSupportFlag = async () => {
    if (cachedSupportsCaption !== null) return cachedSupportsCaption;
    const result = await detectCaptionSupport();
    cachedSupportsCaption = result.supportsCaption;
    return cachedSupportsCaption;
  };

  if (req.method === "GET") {
    let data: any[] = [];
    let supportsCaption = false;
    try {
      const result = await supabaseServiceRole
        .from(SUPABASE_DURATIONS_TABLE)
        .select("filename, duration_ms, caption")
        .order("filename", { ascending: true });
      data = result.data ?? [];
      supportsCaption = true;
    } catch (error: any) {
      const message = error?.message?.toLowerCase?.() ?? "";
      if (message.includes("column") && message.includes("caption")) {
        const fallback = await supabaseServiceRole
          .from(SUPABASE_DURATIONS_TABLE)
          .select("filename, duration_ms")
          .order("filename", { ascending: true });
        if (fallback.error) {
          console.error("Error fetching metadata from Supabase:", fallback.error);
          return res.status(500).json({ error: "Gagal membaca metadata dari Supabase." });
        }
        data = (fallback.data ?? []).map((row: any) => ({ ...row, caption: null }));
        supportsCaption = false;
        cachedSupportsCaption = supportsCaption;
      } else {
        console.error("Error fetching metadata from Supabase:", error);
        return res.status(500).json({ error: "Gagal membaca metadata dari Supabase." });
      }
    }

    const metadata = (data ?? []).map((item: any) => ({
      filename: item.filename,
      durationMs: item.duration_ms ?? null,
      caption: supportsCaption ? item.caption ?? null : null,
    }));

    return res.status(200).json({ metadata });
  }

  if (req.method === "PUT" || req.method === "POST") {
    const payloads = normalizePayload(req.body);
    if (!payloads.length) {
      return res.status(400).json({ error: "Payload metadata tidak valid." });
    }

    const trimmedPayloads = payloads.map((item) => ({
      ...item,
      caption:
        typeof item.caption === "string"
          ? item.caption.trim().slice(0, 500)
          : item.caption ?? null,
    }));

    const supportsCaption = await ensureSupportFlag().catch(() => false);

    const attemptUpsert = async (includeCaption: boolean) =>
      upsertMetadata(
        supabaseServiceRole,
        SUPABASE_DURATIONS_TABLE,
        trimmedPayloads,
        includeCaption
      );

    let upsertError = null;
    let includeCaption = supportsCaption;
    if (includeCaption) {
      const result = await attemptUpsert(true);
      upsertError = result.error;
      if (upsertError) {
        const message = upsertError.message?.toLowerCase() ?? "";
        if (message.includes("column") && message.includes("caption")) {
          includeCaption = false;
          cachedSupportsCaption = false;
        } else {
          console.error("Error upserting metadata:", upsertError);
          return res.status(500).json({ error: "Gagal menyimpan metadata di Supabase." });
        }
      }
    }

    if (!includeCaption) {
      const result = await attemptUpsert(false);
      if (result.error) {
        console.error("Error upserting metadata:", result.error);
        return res.status(500).json({ error: "Gagal menyimpan metadata di Supabase." });
      }
    }

    const filenames = trimmedPayloads.map((item) => item.filename);
    if (filenames.length) {
      const { error: cleanupError } = await clearMissingRows(
        supabaseServiceRole,
        SUPABASE_DURATIONS_TABLE,
        filenames
      );
      if (cleanupError) {
        console.error("Error cleaning up metadata rows:", cleanupError);
      }
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "PUT", "POST"]);
  return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
}
