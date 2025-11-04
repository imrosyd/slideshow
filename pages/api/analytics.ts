import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

const ANALYTICS_FILE = path.join(process.cwd(), "analytics.json");

type AnalyticsData = {
  viewCount: number;
  totalViewTime: number;
  lastViewed: number;
};

type AnalyticsRecord = Record<string, AnalyticsData>;

// Ensure analytics file exists
async function ensureAnalyticsFile(): Promise<AnalyticsRecord> {
  try {
    const content = await fs.readFile(ANALYTICS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    // File doesn't exist, create it
    const initial: AnalyticsRecord = {};
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // Get analytics data
    try {
      const analytics = await ensureAnalyticsFile();
      return res.status(200).json(analytics);
    } catch (error) {
      console.error("Failed to read analytics:", error);
      return res.status(500).json({ error: "Failed to read analytics" });
    }
  }

  if (req.method === "POST") {
    // Update analytics data
    try {
      const { analytics: newData } = req.body as { analytics: AnalyticsRecord };
      
      if (!newData || typeof newData !== "object") {
        return res.status(400).json({ error: "Invalid analytics data" });
      }

      // Read existing analytics
      const existing = await ensureAnalyticsFile();

      // Merge with new data
      const merged: AnalyticsRecord = { ...existing };
      
      Object.entries(newData).forEach(([imageName, data]) => {
        if (merged[imageName]) {
          merged[imageName] = {
            viewCount: merged[imageName].viewCount + data.viewCount,
            totalViewTime: merged[imageName].totalViewTime + data.totalViewTime,
            lastViewed: Math.max(merged[imageName].lastViewed, data.lastViewed),
          };
        } else {
          merged[imageName] = data;
        }
      });

      // Save merged data
      await fs.writeFile(ANALYTICS_FILE, JSON.stringify(merged, null, 2));

      return res.status(200).json({ success: true, analytics: merged });
    } catch (error) {
      console.error("Failed to save analytics:", error);
      return res.status(500).json({ error: "Failed to save analytics" });
    }
  }

  if (req.method === "DELETE") {
    // Reset analytics
    try {
      await fs.writeFile(ANALYTICS_FILE, JSON.stringify({}, null, 2));
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to reset analytics:", error);
      return res.status(500).json({ error: "Failed to reset analytics" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
