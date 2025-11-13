import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import { Database } from "../../lib/database.types"; // Only import Database
import { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient
import { isAuthorizedAdminRequest } from "../../lib/auth";

type Config = {
  [filename: string]: number; // filename -> duration in ms
};

type Data = Config | { message: string } | { error: string };
type DurationRow = { // Keep this local
  filename: string;
  duration_ms: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const SUPABASE_DURATIONS_TABLE = process.env.SUPABASE_DURATIONS_TABLE;

  if (!ADMIN_PASSWORD || !SUPABASE_DURATIONS_TABLE) {
    console.error("ADMIN_PASSWORD or SUPABASE_DURATIONS_TABLE is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Kredensial atau nama tabel Supabase tidak diatur." });
  }

  // Authentication for POST requests (saving config)
  if (req.method === "POST" && !isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  if (req.method === "GET") {
    try {
      const supabaseServiceRole = getSupabaseServiceRoleClient();
      
      if (!supabaseServiceRole) {
        console.warn('[Config] Supabase not configured - returning empty config');
        return res.status(200).json({});
      }
      const { data, error } = await supabaseServiceRole
        .from(SUPABASE_DURATIONS_TABLE as 'image_durations')
        .select("filename, duration_ms");

      if (error) {
        console.error("Error fetching durations from Supabase:", error);
        return res.status(500).json({ error: "Gagal membaca durasi dari Supabase." });
      }

      if (!data) {
        console.error("No duration data returned from Supabase");
        return res.status(500).json({ error: "Gagal membaca durasi dari Supabase." });
      }

      const config: Config = {};
      (data as DurationRow[]).forEach(row => {
        let value: number | null = null;
        if (typeof row.duration_ms === "number") {
          value = row.duration_ms;
        } else if (typeof row.duration_ms === "string") {
          const parsed = Number(row.duration_ms);
          value = Number.isNaN(parsed) ? null : parsed;
        }
        if (value !== null) {
          config[row.filename] = value;
        }
      });

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.status(200).json(config);
    } catch (error) {
      console.error("Error in GET /api/config:", error);
      return res.status(500).json({ error: "Gagal membaca konfigurasi." });
    }
  }

  if (req.method === "POST") {
    try {
      const newConfig: Config = req.body;
      const supabaseServiceRole = getSupabaseServiceRoleClient();
      
      if (!supabaseServiceRole) {
        console.warn('[Config] Supabase not configured - cannot save settings');
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      // Clear existing durations - select all first, then delete
      const { data: allRows } = await supabaseServiceRole
        .from(SUPABASE_DURATIONS_TABLE as 'image_durations')
        .select('filename');
      
      if (allRows && allRows.length > 0) {
        const allFilenames = allRows.map((row) => row.filename);
        const { error: deleteError } = await supabaseServiceRole
          .from(SUPABASE_DURATIONS_TABLE as 'image_durations')
          .delete()
          .in('filename', allFilenames);

        if (deleteError) {
          console.error("Error clearing old durations:", deleteError);
          return res.status(500).json({ error: "Gagal menghapus durasi lama." });
        }
      }

      // Insert new durations
      const durationsToInsert = Object.entries(newConfig).map(([filename, duration_ms]) => ({
        filename,
        duration_ms,
      }));

      if (durationsToInsert.length > 0) {
        const { error: insertError } = await supabaseServiceRole
          .from(SUPABASE_DURATIONS_TABLE as 'image_durations')
          .insert(durationsToInsert as any);

        if (insertError) {
          console.error("Error inserting new durations:", insertError);
          return res.status(500).json({ error: "Gagal menyimpan durasi baru." });
        }
      }

      return res.status(200).json({ message: "Konfigurasi berhasil disimpan di Supabase." });
    } catch (error) {
      console.error("Error in POST /api/config:", error);
      return res.status(500).json({ error: "Gagal menyimpan konfigurasi." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
}
