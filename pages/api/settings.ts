import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // Get settings from database
    try {
      const data = await db.getSettings();

      // Convert array to object with camelCase keys for compatibility
      const settings: Record<string, any> = {
        transitionEffect: 'fade',
        autoRefreshInterval: 60000,
        defaultDuration: 20000,
        // Music settings defaults
        music_enabled: 'false',
        music_source_type: 'upload',
        music_file_url: '',
        music_external_url: '',
        music_youtube_url: '',
        music_volume: '50',
        music_loop: 'true',
        // Video encoding defaults (exposed for visibility/tuning)
        video_crf: '22',
        video_preset: 'veryfast',
        video_profile: 'high',
        video_level: '4.0',
        video_fps: '24',
        video_gop: '48',
        video_width: '1920',
        video_height: '1080',
      };

      data?.forEach((row) => {
        const value = row.value ?? '';
        // Map database keys to frontend keys
        if (row.key === 'transition_effect') {
          settings.transitionEffect = value;
        } else if (row.key === 'auto_refresh_interval') {
          settings.autoRefreshInterval = parseInt(value, 10);
        } else if (row.key === 'default_duration') {
          settings.defaultDuration = parseInt(value, 10);
        } else if (row.key.startsWith('music_')) {
          // Pass through all music settings
          settings[row.key] = value;
        } else if (row.key.startsWith('video_')) {
          // Pass through video encoding settings as-is (snake_case)
          settings[row.key] = value;
        }
      });

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.status(200).json(settings);
    } catch (error: any) {
      console.error("[Settings] GET error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    // Update settings in database
    try {
      const body = req.body as Record<string, any>;
      
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid payload" });
      }

      // Map camelCase to snake_case and upsert
      const updates: Array<{ key: string; value: string }> = [];
      
      if (body.transitionEffect) {
        updates.push({ key: 'transition_effect', value: body.transitionEffect });
      }
      if (body.autoRefreshInterval !== undefined) {
        updates.push({ key: 'auto_refresh_interval', value: String(body.autoRefreshInterval) });
      }
      if (body.defaultDuration !== undefined) {
        updates.push({ key: 'default_duration', value: String(body.defaultDuration) });
      }

      // Upsert each setting
      for (const update of updates) {
        await db.upsertSetting(update.key, update.value);
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[Settings] POST error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
