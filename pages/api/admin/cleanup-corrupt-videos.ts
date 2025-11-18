import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";
import { db } from "../../../lib/db";
import { storage } from "../../../lib/storage-adapter";

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

function checkVideoUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume();
    });
    
    request.on('error', () => {
      resolve(false);
    });
    
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
    
    const orphanedFiles: string[] = [];
    const imageFiles = await storage.listImages();
    console.log(`[Cleanup] Found ${imageFiles.length} files in storage`);
    
    const dbEntries = await db.getImageDurations();
    const dbFilenames = new Set(dbEntries.map(entry => entry.filename));
    console.log(`[Cleanup] Found ${dbFilenames.size} entries in database`);
    
    for (const file of imageFiles) {
      if (!dbFilenames.has(file)) {
        console.log(`[Cleanup] 🗑️ Orphaned file found: ${file}`);
        orphanedFiles.push(file);
        await storage.deleteImage(file);
        console.log(`[Cleanup] ✅ Deleted orphaned file: ${file}`);
      }
    }

    console.log(`[Cleanup] Step 1 complete: ${orphanedFiles.length} orphaned files removed`);
    
    const orphanedDbEntries: string[] = [];
    const allDbEntries = await db.getImageDurations();
    console.log(`[Cleanup] Found ${allDbEntries.length} entries in database`);
    
    const storageFiles = await storage.listImages();
    const storageFilenames = new Set(storageFiles);
    console.log(`[Cleanup] Found ${storageFilenames.size} files in storage`);
    
    for (const entry of allDbEntries) {
      if (entry.is_video) continue;
      
      if (!storageFilenames.has(entry.filename) && entry.filename !== '.emptyFolderPlaceholder') {
        console.log(`[Cleanup] 🗑️ Orphaned DB entry found: ${entry.filename}`);
        orphanedDbEntries.push(entry.filename);
        await db.deleteImageDuration(entry.filename);
        console.log(`[Cleanup] ✅ Deleted orphaned DB entry: ${entry.filename}`);
      }
    }

    console.log(`[Cleanup] Step 2 complete: ${orphanedDbEntries.length} orphaned DB entries removed`);
    
    console.log('[Cleanup] Step 3: Checking corrupt video entries...');
    
    const videos = await db.getImageDurations({ is_video: true, hidden: true });

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

    for (const video of videos) {
      const videoUrl = video.video_url;
      if (!videoUrl) {
        toDelete.push(video.filename);
        continue;
      }
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

    if (toDelete.length > 0) {
      console.log('[Cleanup] Deleting corrupt entries...');
      
      for (const filename of toDelete) {
        await db.deleteImageDuration(filename);
        console.log(`[Cleanup] ✅ Deleted ${filename}`);
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
