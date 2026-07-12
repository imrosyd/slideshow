import type { NextApiRequest, NextApiResponse } from "next";
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

// Derive the stored video filename from a video_url like
// "/storage/videos/dashboard.mp4?v=abc" -> "dashboard.mp4".
function videoFilenameFromUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback;
  return url.split("/").pop()!.split("?")[0];
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

    // Step 1: image files on disk with no DB row.
    const orphanedFiles: string[] = [];
    const imageFiles = await storage.listImages();
    const dbFilenames = new Set((await db.getImageDurations()).map(e => e.filename));

    for (const file of imageFiles) {
      if (!dbFilenames.has(file)) {
        orphanedFiles.push(file);
        await storage.deleteImage(file);
        console.log(`[Cleanup] ✅ Deleted orphaned file: ${file}`);
      }
    }
    console.log(`[Cleanup] Step 1: ${orphanedFiles.length} orphaned files removed`);

    // Step 2: non-video DB rows whose image file is gone.
    const orphanedDbEntries: string[] = [];
    const allDbEntries = await db.getImageDurations();
    const storageFilenames = new Set(await storage.listImages());

    for (const entry of allDbEntries) {
      if (entry.is_video) continue;
      if (!storageFilenames.has(entry.filename) && entry.filename !== '.emptyFolderPlaceholder') {
        orphanedDbEntries.push(entry.filename);
        await db.deleteImageDuration(entry.filename);
        console.log(`[Cleanup] ✅ Deleted orphaned DB entry: ${entry.filename}`);
      }
    }
    console.log(`[Cleanup] Step 2: ${orphanedDbEntries.length} orphaned DB entries removed`);

    // Step 3: video DB rows whose backing file is gone.
    // Check the file on disk, not over HTTP: video_url is a site-relative path
    // (e.g. "/storage/videos/dashboard.mp4"), which https.get cannot resolve.
    // Cover every is_video row — merged entries like dashboard.mp4 are hidden=false,
    // so a hidden-only filter (the previous behaviour) skipped exactly the orphan
    // left behind when all source images are deleted.
    console.log('[Cleanup] Step 3: checking video rows against stored files...');

    const videoEntries = await db.getImageDurations({ is_video: true });
    const storedVideos = new Set(await storage.listVideos());

    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const video of videoEntries) {
      const videoName = videoFilenameFromUrl(video.video_url, video.filename);
      if (storedVideos.has(videoName)) {
        toKeep.push(video.filename);
      } else {
        console.log(`[Cleanup] ❌ ${video.filename}: video file "${videoName}" missing from storage`);
        toDelete.push(video.filename);
      }
    }

    for (const filename of toDelete) {
      await db.deleteImageDuration(filename);
      console.log(`[Cleanup] ✅ Removed orphaned video entry: ${filename}`);
    }
    console.log(`[Cleanup] Step 3: ${toKeep.length} kept, ${toDelete.length} removed`);

    const result: CleanupResult = {
      checked: videoEntries.length,
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
    return res.status(500).json({ error: error.message || "Cleanup failed" });
  }
}
