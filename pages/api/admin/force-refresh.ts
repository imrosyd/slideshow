import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../lib/supabase";

/**
 * Force refresh endpoint - triggers slideshow to reload
 * Uses Supabase Realtime to broadcast refresh signal
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Skip broadcast if Supabase is not configured
    if (!supabase) {
      console.warn('[force-refresh] Supabase not configured - refresh signal skipped');
      res.status(200).json({
        success: true,
        message: 'Refresh signal skipped (Supabase not configured)',
        timestamp: Date.now()
      });
      return;
    }

    // Broadcast refresh signal via Supabase channel using explicit REST delivery
    const channel = supabase.channel('slideshow-control');

    await channel.httpSend('force-refresh', { timestamp: Date.now() });
    await supabase.removeChannel(channel);

    res.status(200).json({
      success: true,
      message: 'Refresh signal sent to slideshow',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Force refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to send refresh signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
