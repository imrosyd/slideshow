import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";
import { isAuthorizedAdminRequest } from "../../lib/auth";

type Config = {
  [filename: string]: number;
};

type Data = Config | { message: string } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST" && !isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  if (req.method === "GET") {
    try {
      const data = await db.getImageDurations();

      const config: Config = {};
      data.forEach(row => {
        let value: number | null = null;
        if (typeof row.duration_ms === "number") {
          value = row.duration_ms;
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

      const durationsToUpsert = Object.entries(newConfig).map(([filename, duration_ms]) => ({
        filename,
        duration_ms,
      }));

      if (durationsToUpsert.length > 0) {
        await db.upsertImageDurations(durationsToUpsert as any[]);
      }

      return res.status(200).json({ message: "Konfigurasi berhasil disimpan." });
    } catch (error) {
      console.error("Error in POST /api/config:", error);
      return res.status(500).json({ error: "Gagal menyimpan konfigurasi." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
}
