import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = getSupabaseServiceRoleClient();

  if (req.method === "GET") {
    // Get settings from database
    try {
      const { data, error } = await supabase
        .from('slideshow_settings')
        .select('*');

      if (error) {
        console.error("[Settings] Error fetching settings:", error);
        return res.status(500).json({ error: "Failed to fetch settings" });
      }

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
      };

      data?.forEach((row) => {
        // Map database keys to frontend keys
        if (row.key === 'transition_effect') {
          settings.transitionEffect = row.value;
        } else if (row.key === 'auto_refresh_interval') {
          settings.autoRefreshInterval = parseInt(row.value, 10);
        } else if (row.key === 'default_duration') {
          settings.defaultDuration = parseInt(row.value, 10);
        } else if (row.key.startsWith('music_')) {
          // Pass through all music settings
          settings[row.key] = row.value;
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
        const { error } = await supabase
          .from('slideshow_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) {
          console.error(`[Settings] Error updating ${update.key}:`, error);
          return res.status(500).json({ error: `Failed to update ${update.key}` });
        }
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[Settings] POST error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
