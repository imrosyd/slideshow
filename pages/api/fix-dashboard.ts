import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    
    // Update existing record from dashboard.mp4 to dashboard.jpg in database
    // But wait, we actually want the database to be dashboard.mp4
    // and create thumbnail image for dashboard.jpg
    
    // First, delete the current record
    const { error: deleteError } = await supabase
      .from('image_durations')
      .delete()
      .eq('filename', 'dashboard.mp4');
    
    if (deleteError) {
      console.error('Error deleting dashboard.mp4:', deleteError);
    }
    
    // Create new record for dashboard.jpg (so it appears in gallery)
    const { data: videoFile } = supabase.storage
      .from('slideshow-videos')
      .getPublicUrl('dashboard.mp4');
    
    // Recreate with dashboard.jpg as filename
    const { error: insertError } = await supabase
      .from('image_durations')
      .insert({
        filename: 'dashboard.jpg',
        duration_ms: 80000,
        caption: 'Merged: 40 images (80s)',
        order_index: 999999,
        hidden: false,
        is_video: true,
        video_url: videoFile.publicUrl,
        video_generated_at: new Date().toISOString(),
        video_duration_seconds: 80,
      });
    
    if (insertError) {
      console.error('Error inserting dashboard.jpg:', insertError);
      return res.status(500).json({ error: insertError.message });
    }
    
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
