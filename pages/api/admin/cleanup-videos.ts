import { NextApiRequest, NextApiResponse } from 'next';
import { isAuthorizedAdminRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { storage } from '../../../lib/storage-adapter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Cleanup Videos] Starting cleanup process...');

  try {
    const storageFiles = await storage.listVideos();
    console.log(`[Cleanup Videos] Found ${storageFiles?.length || 0} files in storage`);

    const dbRecords = await db.getImageDurations({ is_video: true });
    console.log(`[Cleanup Videos] Found ${dbRecords?.length || 0} video records in database`);

    const dbVideoFilenames = new Set(
      (dbRecords || [])
        .map(record => record.video_url?.split('/').pop())
        .filter(Boolean)
    );

    console.log('[Cleanup Videos] Video files in database:', Array.from(dbVideoFilenames));

    const orphanedFiles = (storageFiles || [])
      .filter(file => !dbVideoFilenames.has(file))
      .map(file => file);

    console.log(`[Cleanup Videos] Found ${orphanedFiles.length} orphaned files:`, orphanedFiles);

    if (orphanedFiles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No orphaned videos found',
        deletedCount: 0,
        deletedFiles: [],
      });
    }

    for (const file of orphanedFiles) {
      await storage.deleteVideo(file);
    }

    console.log(`[Cleanup Videos] ✅ Deleted ${orphanedFiles.length} orphaned video file(s)`);

    return res.status(200).json({
      success: true,
      message: `Cleaned up ${orphanedFiles.length} orphaned video(s)`,
      deletedCount: orphanedFiles.length,
      deletedFiles: orphanedFiles,
    });
  } catch (error) {
    console.error('[Cleanup Videos] Error:', error);
    return res.status(500).json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
