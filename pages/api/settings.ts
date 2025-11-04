import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "slideshow-settings.json");

type SlideshowSettings = {
  transitionEffect?: "fade" | "slide" | "zoom" | "none";
  autoRefreshInterval?: number;
  defaultDuration?: number;
};

// Ensure settings file exists
async function ensureSettingsFile(): Promise<SlideshowSettings> {
  try {
    const content = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    // File doesn't exist, create it with defaults
    const initial: SlideshowSettings = {
      transitionEffect: "fade",
      autoRefreshInterval: 60000,
      defaultDuration: 15000,
    };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // Get settings
    try {
      const settings = await ensureSettingsFile();
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Failed to read settings:", error);
      return res.status(500).json({ error: "Failed to read settings" });
    }
  }

  if (req.method === "POST") {
    // Update settings
    try {
      const newSettings = req.body as Partial<SlideshowSettings>;
      
      if (!newSettings || typeof newSettings !== "object") {
        return res.status(400).json({ error: "Invalid settings data" });
      }

      // Read existing settings
      const existing = await ensureSettingsFile();

      // Merge with new settings
      const merged: SlideshowSettings = {
        ...existing,
        ...newSettings,
      };

      // Save merged settings
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2));

      return res.status(200).json({ success: true, settings: merged });
    } catch (error) {
      console.error("Failed to save settings:", error);
      return res.status(500).json({ error: "Failed to save settings" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
