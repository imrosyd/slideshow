import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import https from "https";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type CleanupResult = {
  checked: number;
  deleted: number;
  kept: number;
  deletedEntries: string[];
  keptEntries: string[];
  orphanedFiles?: number;
  orphanedFilesList?: string[];
  orphanedDbEntries?: number;
  orphanedDbEntriesList?: string[];
};

// Function to check if video URL is accessible
function checkVideoUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume(); // Drain the response
    });
    
    request.on('error', () => {
      resolve(false);
    });
    
    // Set timeout to avoid hanging
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupResult | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log('[Cleanup] Starting corrupt video cleanup...');
    
    // Step 1: Cleanup orphaned files in storage (files without database entries)
    console.log('[Cleanup] Step 1: Checking for orphaned files in storage...');
    
    const orphanedFiles: string[] = [];
    
    // Get all files from slideshow-images bucket
    const { data: imageFiles, error: imageListError } = await supabase
      .storage
      .from('slideshow-images')
      .list();

    if (!imageListError && imageFiles) {
      console.log(`[Cleanup] Found ${imageFiles.length} files in slideshow-images storage`);
      
      // Get all filenames from database
      const { data: dbEntries, error: dbError } = await supabase
        .from('image_durations')
        .select('filename');

      if (!dbError && dbEntries) {
        const dbFilenames = new Set(dbEntries.map(entry => entry.filename));
        console.log(`[Cleanup] Found ${dbFilenames.size} entries in database`);
        
        // Find files that exist in storage but not in database
        for (const file of imageFiles) {
          if (!dbFilenames.has(file.name)) {
            console.log(`[Cleanup] 🗑️ Orphaned file found: ${file.name}`);
            orphanedFiles.push(file.name);
            
            // Delete orphaned file from storage
            const { error: deleteStorageError } = await supabase
              .storage
              .from('slideshow-images')
              .remove([file.name]);

            if (deleteStorageError) {
              console.error(`[Cleanup] ❌ Failed to delete orphaned file ${file.name}:`, deleteStorageError);
            } else {
              console.log(`[Cleanup] ✅ Deleted orphaned file: ${file.name}`);
            }
          }
        }
      }
    }

    console.log(`[Cleanup] Step 1 complete: ${orphanedFiles.length} orphaned files removed`);
    
    // Step 2: Cleanup orphaned database entries (entries without storage files)
    console.log('[Cleanup] Step 2: Checking for orphaned database entries...');
    
    const orphanedDbEntries: string[] = [];
    
    // Get all database entries
    const { data: allDbEntries, error: allDbError } = await supabase
      .from('image_durations')
      .select('filename, is_video');

    if (!allDbError && allDbEntries) {
      console.log(`[Cleanup] Found ${allDbEntries.length} entries in database`);
      
      // Get fresh list of files in storage
      const { data: storageFiles, error: storageError } = await supabase
        .storage
        .from('slideshow-images')
        .list();

      if (!storageError && storageFiles) {
        const storageFilenames = new Set(storageFiles.map(f => f.name));
        console.log(`[Cleanup] Found ${storageFilenames.size} files in storage`);
        
        // Find database entries that don't have corresponding files in storage
        for (const entry of allDbEntries) {
          // Skip video entries (they reference slideshow-videos, not slideshow-images)
          if (entry.is_video) continue;
          
          if (!storageFilenames.has(entry.filename) && entry.filename !== '.emptyFolderPlaceholder') {
            console.log(`[Cleanup] 🗑️ Orphaned DB entry found: ${entry.filename}`);
            orphanedDbEntries.push(entry.filename);
            
            // Delete orphaned database entry
            const { error: deleteDbError } = await supabase
              .from('image_durations')
              .delete()
              .eq('filename', entry.filename);

            if (deleteDbError) {
              console.error(`[Cleanup] ❌ Failed to delete orphaned DB entry ${entry.filename}:`, deleteDbError);
            } else {
              console.log(`[Cleanup] ✅ Deleted orphaned DB entry: ${entry.filename}`);
            }
          }
        }
      }
    }

    console.log(`[Cleanup] Step 2 complete: ${orphanedDbEntries.length} orphaned DB entries removed`);
    
    // Step 3: Get all video entries that are hidden (placeholder images)
    console.log('[Cleanup] Step 3: Checking corrupt video entries...');
    
    const { data: videos, error: fetchError } = await supabase
      .from('image_durations')
      .select('*')
      .eq('is_video', true)
      .eq('hidden', true);

    if (fetchError) {
      console.error('[Cleanup] Database fetch error:', fetchError);
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    if (!videos || videos.length === 0) {
      console.log('[Cleanup] No hidden video entries found');
      return res.status(200).json({
        checked: 0,
        deleted: 0,
        kept: 0,
        deletedEntries: [],
        keptEntries: [],
        orphanedFiles: orphanedFiles.length,
        orphanedFilesList: orphanedFiles,
        orphanedDbEntries: orphanedDbEntries.length,
        orphanedDbEntriesList: orphanedDbEntries,
      });
    }

    console.log(`[Cleanup] Found ${videos.length} hidden video entries`);

    const toDelete: string[] = [];
    const toKeep: string[] = [];

    // Check each video URL
    for (const video of videos) {
      const videoUrl = video.video_url;
      console.log(`[Cleanup] Checking ${video.filename}: ${videoUrl}`);

      const isAccessible = await checkVideoUrl(videoUrl);

      if (isAccessible) {
        console.log(`[Cleanup] ✅ ${video.filename} - accessible`);
        toKeep.push(video.filename);
      } else {
        console.log(`[Cleanup] ❌ ${video.filename} - NOT accessible`);
        toDelete.push(video.filename);
      }
    }

    console.log(`[Cleanup] Summary: ${toKeep.length} to keep, ${toDelete.length} to delete`);

    // Delete corrupt video entries
    if (toDelete.length > 0) {
      console.log('[Cleanup] Deleting corrupt entries...');
      
      for (const filename of toDelete) {
        const { error: deleteError } = await supabase
          .from('image_durations')
          .delete()
          .eq('filename', filename);

        if (deleteError) {
          console.error(`[Cleanup] Error deleting ${filename}:`, deleteError);
        } else {
          console.log(`[Cleanup] ✅ Deleted ${filename}`);
        }
      }
    }

    const result: CleanupResult = {
      checked: videos.length,
      deleted: toDelete.length,
      kept: toKeep.length,
      deletedEntries: toDelete,
      keptEntries: toKeep,
      orphanedFiles: orphanedFiles.length,
      orphanedFilesList: orphanedFiles,
      orphanedDbEntries: orphanedDbEntries.length,
      orphanedDbEntriesList: orphanedDbEntries,
    };

    console.log('[Cleanup] Cleanup complete:', result);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return res.status(500).json({ 
      error: error.message || "Cleanup failed" 
    });
  }
}
