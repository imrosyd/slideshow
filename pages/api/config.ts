import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";

type Config = {
  [filename: string]: number; // filename -> duration in ms
};

type Data = Config | { message: string } | { error: string };
type DurationRow = {
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
  if (req.method === "POST") {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
      return res.status(401).json({ error: "Akses ditolak." });
    }
  }

  if (req.method === "GET") {
    try {
      const supabaseServiceRole = getSupabaseServiceRoleClient();
      const { data, error } = await supabaseServiceRole
        .from<DurationRow>(SUPABASE_DURATIONS_TABLE)
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
      data.forEach(row => {
        config[row.filename] = row.duration_ms;
      });

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

      // Clear existing durations
      const { error: deleteError } = await supabaseServiceRole
        .from(SUPABASE_DURATIONS_TABLE)
        .delete()
        .neq('filename', '' /* delete all */);

      if (deleteError) {
        console.error("Error clearing old durations:", deleteError);
        return res.status(500).json({ error: "Gagal menghapus durasi lama." });
      }

      // Insert new durations
      const durationsToInsert = Object.entries(newConfig).map(([filename, duration_ms]) => ({
        filename,
        duration_ms,
      }));

      if (durationsToInsert.length > 0) {
        const { error: insertError } = await supabaseServiceRole
          .from(SUPABASE_DURATIONS_TABLE)
          .insert(durationsToInsert);

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
