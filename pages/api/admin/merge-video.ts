import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { db } from "../../../lib/db";
import { storage } from "../../../lib/storage-adapter";
import { broadcast } from "../../../lib/websocket";
// @ts-ignore
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

type ImageInput = {
  filename: string;
  durationSeconds: number;
};

type RequestBody = {
  images: ImageInput[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { images }: RequestBody = req.body;

  if (!images || !Array.isArray(images) || images.length < 1) {
    return res.status(400).json({ error: "At least 1 image required" });
  }

  const videoFilename = "dashboard.mp4";
  const placeholderImageName = "dashboard.jpg";

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "merge-video-"));
  const tempFiles: string[] = [];

  try {
    console.log(`[Merge Video] Starting merge of ${images.length} images`);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imagePath = (storage as any).getImagePath(img.filename);
      const tempImagePath = path.join(tempDir, `image_${i}.jpg`);
      await fs.copyFile(imagePath, tempImagePath);
      tempFiles.push(tempImagePath);
      console.log(`[Merge Video] Copied ${img.filename} (${img.durationSeconds}s)`);
    }

    const concatFilePath = path.join(tempDir, "concat.txt");
    const concatLines: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const tempImagePath = path.join(tempDir, `image_${i}.jpg`);
      concatLines.push(`file '${tempImagePath}'`);
      if (i < images.length - 1) {
        concatLines.push(`duration ${images[i].durationSeconds}`);
      }
    }
    const finalConcatContent = concatLines.join("\n");
    await fs.writeFile(concatFilePath, finalConcatContent);
    console.log(`[Merge Video] Concat file created with ${images.length} images`);

    const settings = await db.getSettings();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    
    const defaultEnc = {
      fps: parseInt(settingsMap.get('video_fps') || '30', 10),
      gop: parseInt(settingsMap.get('video_gop') || '60', 10),
      profile: (settingsMap.get('video_profile') || 'high') as 'baseline' | 'main' | 'high',
      level: settingsMap.get('video_level') || '4.0',
      preset: (settingsMap.get('video_preset') || 'medium') as 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow',
      crf: parseInt(settingsMap.get('video_crf') || '23', 10),
      width: parseInt(settingsMap.get('video_width') || '1920', 10),
      height: parseInt(settingsMap.get('video_height') || '1080', 10),
    };

    const outputPath = path.join(tempDir, "output.mp4");

    await new Promise<void>((resolve, reject) => {
      const args = [
        "-f", "concat",
        "-safe", "0",
        "-i", concatFilePath,
        "-vf", `scale=${defaultEnc.width}:${defaultEnc.height}:force_original_aspect_ratio=decrease,pad=${defaultEnc.width}:${defaultEnc.height}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p`,
        "-c:v", "libx264",
        "-r", defaultEnc.fps.toString(),
        "-g", defaultEnc.gop.toString(),
        "-profile:v", defaultEnc.profile,
        "-level", defaultEnc.level,
        "-preset", defaultEnc.preset,
        "-crf", defaultEnc.crf.toString(),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-tune", "stillimage",
        "-y",
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath.path, args);
      let stderr = "";
      ffmpeg.stderr.on("data", (data) => { stderr += data.toString(); });
      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error(`[Merge Video] FFmpeg error:\n${stderr}`);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
      ffmpeg.on("error", (err) => reject(err));
    });

    await storage.deleteVideo(videoFilename);
    const videoBuffer = await fs.readFile(outputPath);
    const videoUrl = await storage.uploadVideo(videoFilename, videoBuffer);
    console.log(`[Merge Video] Uploaded ${videoFilename} successfully`);

    for (const image of images) {
      const existingData = await db.getImageDurationByFilename(image.filename);
      if (existingData?.video_url) {
        const videoStoragePath = existingData.video_url.split('/').pop()!;
        await storage.deleteVideo(videoStoragePath);
        await db.updateImageDuration(image.filename, { video_url: null, video_duration_ms: null });
      }
    }

    const totalDuration = images.reduce((sum, img) => sum + img.durationSeconds, 0);
    const placeholderPath = path.join(tempDir, 'placeholder.jpg');
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath.path, ['-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:d=1', '-frames:v', '1', '-y', placeholderPath]);
      ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg placeholder failed with code ${code}`)));
      ffmpeg.on('error', reject);
    });

    await storage.deleteImage(placeholderImageName);
    const placeholderBuffer = await fs.readFile(placeholderPath);
    await storage.uploadImage(placeholderImageName, placeholderBuffer);

    const generatedAt = new Date().toISOString();
    const cacheBustTimestamp = Date.now();
    
    const metadataData = {
      filename: videoFilename,
      duration_ms: totalDuration * 1000,
      caption: `Merged: ${images.length} images (${totalDuration}s)`,
      order_index: 999999,
      hidden: false,
      is_video: true,
      video_url: `${videoUrl}?t=${cacheBustTimestamp}`,
      video_duration_ms: totalDuration * 1000,
    };
    
    await db.upsertImageDuration(metadataData);

    const placeholderMetadataData = {
      filename: placeholderImageName,
      duration_ms: totalDuration * 1000,
      caption: `Merged: ${images.length} images (${totalDuration}s)`,
      order_index: 999999,
      hidden: false,
      is_video: true,
      video_url: `${videoUrl}?t=${cacheBustTimestamp}`,
      video_duration_ms: totalDuration * 1000,
    };
    await db.upsertImageDuration(placeholderMetadataData);

    try {
      broadcast(JSON.stringify({
        event: 'video-updated',
        payload: {
          slideName: videoFilename,
          videoUrl: videoUrl,
          videoDurationSeconds: totalDuration,
          action: 'created'
        }
      }));
      console.log(`[Merge Video] Broadcast: Created merged video to main pages - dashboard.mp4`);
    } catch (broadcastError) {
      console.warn('[Merge Video] Failed to broadcast video update:', broadcastError);
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return res.status(200).json({
      success: true,
      filename: "dashboard.mp4",
      imageCount: images.length,
      mainPage: true,
      totalDuration,
      deletedVideos: images.length,
    });

  } catch (error) {
    console.error("[Merge Video] Error:", error);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to merge video"
    });
  }
}
