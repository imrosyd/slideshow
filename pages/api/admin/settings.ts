import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { isAuthorizedAdminRequest } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // GET - Read settings
  if (req.method === "GET") {
    try {
      const data = await db.getSettings();

      // Convert array to object
      const settings: Record<string, string> = {};
      data?.forEach((row) => {
        settings[row.key] = row.value ?? '';
      });

      // Set defaults if not found
      if (!settings.transition_effect) {
        settings.transition_effect = 'fade';
      }

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.status(200).json(settings);
    } catch (error: any) {
      console.error("[Settings API] GET error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update setting
  if (req.method === "PUT") {
    if (!isAuthorizedAdminRequest(req)) {
      return res.status(401).json({ error: "Akses ditolak." });
    }

    try {
      const { key, value } = req.body;

      if (!key || typeof value !== 'string') {
        return res.status(400).json({ error: "Invalid payload" });
      }

      await db.upsertSetting(key, value);

      console.log(`[Settings API] Saved ${key} = ${value}`);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[Settings API] PUT error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
