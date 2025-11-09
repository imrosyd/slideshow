import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../lib/auth";

type MetadataPayload = {
  filename: string;
  durationMs: number | null;
  caption?: string | null;
  order?: number;
  hidden?: boolean;
};

const DEFAULT_DURATION_MS = 20000;

type UpsertRecord = {
  filename: string;
  duration_ms: number;
  caption: string | null;
  order_index: number;
  hidden: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  const supabase = getSupabaseServiceRoleClient();

  if (req.method === "PUT") {
    try {
      const payload = req.body as MetadataPayload[];
      
      if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Expected array of metadata" });
      }

      const upsertPayload: UpsertRecord[] = payload
        .filter((item): item is MetadataPayload => Boolean(item?.filename))
        .map((item, index) => {
          const hasValidDuration = typeof item.durationMs === "number" && Number.isFinite(item.durationMs);
          const roundedDuration = hasValidDuration
            ? Math.max(0, Math.round(item.durationMs as number))
            : DEFAULT_DURATION_MS;

          const record: UpsertRecord = {
            filename: item.filename,
            duration_ms: roundedDuration,
            caption: item.caption ?? null,
            order_index: item.order ?? index,
            hidden: typeof item.hidden === "boolean" ? item.hidden : false,
          };

          console.log(`[Metadata] Upserting ${record.filename}: hidden=${record.hidden}, duration=${record.duration_ms}`);
          return record;
        });

      if (!upsertPayload.length) {
        return res.status(200).json({ success: true, count: 0 });
      }

      const { error: upsertError } = await supabase
        .from('image_durations')
        .upsert(upsertPayload, {
          onConflict: 'filename',
        });

      if (upsertError) {
        console.error(`[Metadata] Failed to upsert batch:`, upsertError);
        return res.status(500).json({ error: upsertError.message });
      }

      console.log(`[Metadata] Upserted ${upsertPayload.length} records successfully`);
      
      // Broadcast image metadata changes to refresh galleries
      try {
        const supabase = getSupabaseServiceRoleClient();
        const channel = supabase.channel('image-metadata-updates');
        await channel.send({
          type: 'broadcast',
          event: 'image-updated',
          payload: {
            updatedAt: new Date().toISOString(),
            totalCount: upsertPayload.length
          }
        }, { httpSend: true });
        console.log(`[Metadata] Broadcast: Updated ${upsertPayload.length} images`);
      } catch (broadcastError) {
        console.warn('[Metadata] Failed to broadcast image update:', broadcastError);
      }
      
      return res.status(200).json({ success: true, count: upsertPayload.length });
    } catch (error: any) {
      console.error("[Metadata] PUT error:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        details: error.message 
      });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
