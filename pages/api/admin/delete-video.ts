import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { isAuthorizedAdminRequest } from '../../../lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DeleteVideoRequest {
  filename: string;
  videoUrl: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authorization
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { filename, videoUrl } = req.body as DeleteVideoRequest;

  if (!filename || !videoUrl) {
    return res.status(400).json({ error: 'Missing filename or videoUrl' });
  }

  console.log(`[Delete Video] Starting deletion for: ${filename}`);
  console.log(`[Delete Video] Video URL: ${videoUrl}`);

  try {
    // Extract video filename from URL
    // URL format: https://[...].supabase.co/storage/v1/object/public/slideshow-videos/batch-video-xxx.mp4
    const videoFilename = videoUrl.split('/slideshow-videos/').pop();
    
    if (!videoFilename) {
      throw new Error('Could not extract video filename from URL');
    }

    console.log(`[Delete Video] Extracted filename: ${videoFilename}`);

    // 1. Delete video file from Supabase Storage
    const { error: storageError } = await supabase
      .storage
      .from('slideshow-videos')
      .remove([videoFilename]);

    if (storageError) {
      console.error('[Delete Video] Storage deletion error:', storageError);
      // Continue even if storage delete fails (file might already be deleted)
    } else {
      console.log(`[Delete Video] ✅ Video file deleted from storage: ${videoFilename}`);
    }

    // 2. Update database to clear video flags
    const { error: dbError } = await supabase
      .from('image_durations')
      .update({
        is_video: false,
        video_url: null,
        video_duration_seconds: null,
        video_generated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('filename', filename);

    if (dbError) {
      console.error('[Delete Video] Database update error:', dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    console.log(`[Delete Video] ✅ Database updated for: ${filename}`);

    return res.status(200).json({
      success: true,
      message: `Video deleted successfully for ${filename}`,
      deletedFile: videoFilename,
    });
  } catch (error) {
    console.error('[Delete Video] Error:', error);
    return res.status(500).json({
      error: 'Video deletion failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
