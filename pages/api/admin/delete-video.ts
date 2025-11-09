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
    // Convert image filename to video filename
    // e.g., "image.jpg" -> "image.mp4"
    const videoFilename = filename.replace(/\.[^/.]+$/, '.mp4');
    
    console.log(`[Delete Video] Video filename: ${videoFilename}`);

    // 1. Check if video file exists in storage first
    const { data: existingFiles } = await supabase
      .storage
      .from('slideshow-videos')
      .list('', { search: videoFilename });

    if (!existingFiles || existingFiles.length === 0) {
      console.warn(`[Delete Video] Video file not found in storage: ${videoFilename}`);
    }

    // 2. Delete video file from Supabase Storage
    const { error: storageError } = await supabase
      .storage
      .from('slideshow-videos')
      .remove([videoFilename]);

    if (storageError) {
      console.error('[Delete Video] Storage deletion error:', storageError);
      // Don't throw error, continue to update database
    } else {
      console.log(`[Delete Video] ✅ Video file deleted from storage: ${videoFilename}`);
    }

    // 3. Verify deletion from storage
    const { data: verifyFiles } = await supabase
      .storage
      .from('slideshow-videos')
      .list('', { search: videoFilename });

    if (verifyFiles && verifyFiles.length > 0) {
      console.error(`[Delete Video] ❌ Video file still exists after deletion!`);
    } else {
      console.log(`[Delete Video] ✅ Verified: Video file removed from storage`);
    }

    // 4. Check if this is a merged video placeholder (hidden and has no actual image)
    const { data: imageData } = await supabase
      .from('image_durations')
      .select('hidden')
      .eq('filename', filename)
      .single();

    const isMergedPlaceholder = imageData?.hidden ?? false;

    // 5. For merged video placeholders, delete the placeholder image from storage too
    // For regular images, just clear video flags
    let dbError;
    if (isMergedPlaceholder) {
      // Delete the placeholder image from slideshow-images storage
      try {
        const { error: imageDeleteError } = await supabase.storage
          .from('slideshow-images')
          .remove([filename]);

        if (imageDeleteError) {
          console.warn(`[Delete Video] Failed to delete placeholder image: ${imageDeleteError.message}`);
        } else {
          console.log(`[Delete Video] ✅ Deleted placeholder image: ${filename}`);
        }
      } catch (imageError) {
        console.warn(`[Delete Video] Error deleting placeholder image:`, imageError);
      }

      // Completely delete the metadata entry for merged video placeholders
      const { error: deleteError } = await supabase
        .from('image_durations')
        .delete()
        .eq('filename', filename);
      
      dbError = deleteError;
      if (!deleteError) {
        console.log(`[Delete Video] ✅ Deleted merged video placeholder metadata: ${filename}`);
      }
    } else {
      // For regular images, just clear video flags
      const { error: updateError } = await supabase
        .from('image_durations')
        .update({
          is_video: false,
          video_url: null,
          video_duration_seconds: null,
          video_generated_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('filename', filename);
      
      dbError = updateError;
    }

    if (dbError) {
      console.error('[Delete Video] Database update error:', dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    console.log(`[Delete Video] ✅ Database updated for: ${filename}`);

    // Broadcast video deletion to all main page viewers
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const channel = supabase.channel('video-updates');
      await channel.send({
        type: 'broadcast',
        event: 'video-updated',
        payload: {
          slideName: filename,
          action: 'deleted',
          videoUrl: null,
          videoDurationSeconds: null,
          isVideo: false,
        }
      }, { httpSend: true });
      
      console.log(`[Delete Video] Broadcast: Deleted video from main pages - ${filename}`);
    } catch (broadcastError) {
      console.warn('[Delete Video] Failed to broadcast video deletion:', broadcastError);
    }

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
