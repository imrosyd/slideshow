import { NextApiRequest, NextApiResponse } from 'next';
import { isAuthorizedAdminRequest } from '../../../lib/auth';
import { storage } from '../../../lib/storage-adapter';
import { db } from '../../../lib/db';
import { broadcast } from '../../../lib/websocket';

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
    const videoFilename = filename.replace(/\.[^/.]+$/, '.mp4');
    
    console.log(`[Delete Video] Video filename: ${videoFilename}`);

    await storage.deleteVideo(videoFilename);
    console.log(`[Delete Video] ✅ Video file deleted from storage: ${videoFilename}`);

    const image = await db.getImageDurationByFilename(filename);
    const isMergedPlaceholder = image?.hidden ?? false;

    if (isMergedPlaceholder) {
      await storage.deleteImage(filename);
      console.log(`[Delete Video] ✅ Deleted placeholder image: ${filename}`);
      await db.deleteImageDuration(filename);
      console.log(`[Delete Video] ✅ Deleted merged video placeholder metadata: ${filename}`);
    } else {
      await db.updateImageDuration(filename, {
        is_video: false,
        video_url: null,
        video_duration_ms: null,
        video_hash: null,
      });
    }

    console.log(`[Delete Video] ✅ Database updated for: ${filename}`);

    // Broadcast video deletion to all main page viewers
    try {
      broadcast(JSON.stringify({
        event: 'video-updated',
        payload: {
          slideName: filename,
          action: 'deleted',
          videoUrl: null,
          videoDurationSeconds: null,
          isVideo: false,
        }
      }));
      
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
