import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { isAuthorizedAdminRequest } from '../../../lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cleanup orphaned videos in storage bucket
 * This removes videos that exist in storage but not referenced in database
 */
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

  console.log('[Cleanup Videos] Starting cleanup process...');

  try {
    // 1. Get all video files from storage bucket
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('slideshow-videos')
      .list();

    if (storageError) {
      throw new Error(`Failed to list storage files: ${storageError.message}`);
    }

    console.log(`[Cleanup Videos] Found ${storageFiles?.length || 0} files in storage`);

    // 2. Get all video URLs from database
    const { data: dbRecords, error: dbError } = await supabase
      .from('image_durations')
      .select('video_url')
      .eq('is_video', true)
      .not('video_url', 'is', null);

    if (dbError) {
      throw new Error(`Failed to query database: ${dbError.message}`);
    }

    console.log(`[Cleanup Videos] Found ${dbRecords?.length || 0} video records in database`);

    // 3. Extract video filenames from URLs
    const dbVideoFilenames = new Set(
      (dbRecords || [])
        .map(record => record.video_url?.split('/slideshow-videos/').pop())
        .filter(Boolean)
    );

    console.log('[Cleanup Videos] Video files in database:', Array.from(dbVideoFilenames));

    // 4. Find orphaned files (in storage but not in database)
    const orphanedFiles = (storageFiles || [])
      .filter(file => !dbVideoFilenames.has(file.name))
      .map(file => file.name);

    console.log(`[Cleanup Videos] Found ${orphanedFiles.length} orphaned files:`, orphanedFiles);

    if (orphanedFiles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No orphaned videos found',
        deletedCount: 0,
        deletedFiles: [],
      });
    }

    // 5. Delete orphaned files
    const { data: deleteData, error: deleteError } = await supabase
      .storage
      .from('slideshow-videos')
      .remove(orphanedFiles);

    if (deleteError) {
      console.error('[Cleanup Videos] Delete error:', deleteError);
      throw new Error(`Failed to delete files: ${deleteError.message}`);
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
