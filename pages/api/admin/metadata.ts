import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../lib/auth";

type ImageMetadata = {
  filename: string;
  duration_ms: number;
  caption?: string;
  order?: number;
};

type MetadataStore = {
  images: Record<string, ImageMetadata>;
  order: string[];
  updated_at: string;
};

type MetadataPayload = {
  filename: string;
  durationMs: number | null;
  caption?: string | null;
  order?: number;
};

const METADATA_FILE = "metadata.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
  if (!SUPABASE_STORAGE_BUCKET) {
    return res.status(500).json({ error: "Konfigurasi server salah." });
  }

  const supabase = getSupabaseServiceRoleClient();

  if (req.method === "PUT") {
    try {
      const payload = req.body as MetadataPayload[];
      
      if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Expected array of metadata" });
      }

      console.log(`[Metadata] Saving metadata for ${payload.length} images`);

      let metadata: MetadataStore = { 
        images: {}, 
        order: [],
        updated_at: new Date().toISOString() 
      };
      
      const { data: existingData } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .download(METADATA_FILE);

      if (existingData) {
        try {
          const text = await existingData.text();
          metadata = JSON.parse(text);
          // Ensure order array exists
          if (!metadata.order) {
            metadata.order = [];
          }
        } catch (err) {
          console.log("[Metadata] Creating new metadata file");
        }
      }

      // Update metadata and build order array
      const newOrder: string[] = [];
      payload.forEach((item, index) => {
        if (item.filename && typeof item.durationMs === 'number') {
          metadata.images[item.filename] = {
            filename: item.filename,
            duration_ms: item.durationMs,
            caption: item.caption || undefined,
            order: index,
          };
          newOrder.push(item.filename);
        }
      });
      
      metadata.order = newOrder;
      metadata.updated_at = new Date().toISOString();

      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: "application/json",
      });

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(METADATA_FILE, metadataBlob, {
          upsert: true,
          contentType: "application/json",
        });

      if (uploadError) {
        console.error("[Metadata] Upload error:", uploadError);
        return res.status(500).json({ error: "Failed to save metadata" });
      }

      console.log(`[Metadata] Successfully saved ${Object.keys(metadata.images).length} entries`);
      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("[Metadata] PUT error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
