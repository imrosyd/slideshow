import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { db } from '../../../lib/db';
import { storage } from '../../../lib/storage-adapter';
import computeFileHash from '../../../lib/file-hash';

const execAsync = promisify(exec);
const ffmpegPath = ffmpegInstaller.path;

interface VideoImageData {
  filename: string;
  durationSeconds: number;
}

interface GenerateVideoRequest {
  filenames?: string[];
  filename?: string;
  durationSeconds?: number;
  videoData?: VideoImageData[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filenames, filename, durationSeconds, videoData } = req.body as GenerateVideoRequest;
  
  let imagesToProcess: string[] = [];
  let imageDurations: Map<string, number> = new Map();
  let totalDurationSeconds: number = 0;

  if (videoData && Array.isArray(videoData) && videoData.length > 0) {
    imagesToProcess = videoData.map(v => v.filename);
    videoData.forEach(v => {
      imageDurations.set(v.filename, v.durationSeconds);
      totalDurationSeconds += v.durationSeconds;
    });
  } else {
    imagesToProcess = filenames && filenames.length > 0 ? filenames : (filename ? [filename] : []);
    
    if (imagesToProcess.length === 0 || !durationSeconds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const durationPerImage = Math.max(1, Math.floor(durationSeconds! / imagesToProcess.length));
    const remainder = durationSeconds! - (durationPerImage * imagesToProcess.length);
    
    imagesToProcess.forEach((img, idx) => {
      const duration = idx === 0 ? durationPerImage + remainder : durationPerImage;
      imageDurations.set(img, duration);
    });
    totalDurationSeconds = durationSeconds!;
  }

  if (imagesToProcess.length === 0) {
    return res.status(400).json({ error: 'No images to process' });
  }

  try {
    const settings = await db.getSettings();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    
    const defaultEnc = {
      fps: parseInt(settingsMap.get('video_fps') || '24', 10),
      gop: parseInt(settingsMap.get('video_gop') || '48', 10),
      profile: (settingsMap.get('video_profile') || 'high') as 'baseline' | 'main' | 'high',
      level: settingsMap.get('video_level') || '4.0',
      preset: (settingsMap.get('video_preset') || 'veryfast') as 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow',
      crf: parseInt(settingsMap.get('video_crf') || '22', 10),
      width: parseInt(settingsMap.get('video_width') || '1920', 10),
      height: parseInt(settingsMap.get('video_height') || '1080', 10),
    };

    const tempDir = path.join('/tmp', 'slideshow-video-gen-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    const imagePaths: string[] = [];
    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgFilename = imagesToProcess[i];
      const tempImagePath = path.join(tempDir, `image-${i}.jpg`);
      const imagePath = (storage as any).getImagePath(imgFilename);
      await fs.copyFile(imagePath, tempImagePath);
      imagePaths.push(tempImagePath);
    }

    const tempVideoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
    let ffmpegCmd = `"${ffmpegPath}"`;
    let totalDurationEffective = 0;

    for (let i = 0; i < imagePaths.length; i++) {
      const imgFilename = imagesToProcess[i];
      const imageDurationRaw = imageDurations.get(imgFilename) || 0;
      const imageDuration = Math.max(1, Math.floor(imageDurationRaw));
      ffmpegCmd += ` -loop 1 -framerate ${defaultEnc.fps} -t ${imageDuration} -i "${imagePaths[i]}"`;
      totalDurationEffective += imageDuration;
    }
    
    const inputCount = imagePaths.length;
    let filterComplex = '';
    
    for (let i = 0; i < inputCount; i++) {
      filterComplex += `[${i}:v]scale=${defaultEnc.width}:${defaultEnc.height}:force_original_aspect_ratio=decrease:eval=frame,pad=${defaultEnc.width}:${defaultEnc.height}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[v${i}];`;
    }

    filterComplex += inputCount === 1
      ? `[v0]null[out]`
      : Array.from({ length: inputCount }, (_, i) => `[v${i}]`).join('') + `concat=n=${inputCount}:v=1:a=0,format=yuv420p[out]`;

    ffmpegCmd += ` -filter_complex "${filterComplex}" -map "[out]" -c:v libx264 -r ${defaultEnc.fps} -g ${defaultEnc.gop} -profile:v ${defaultEnc.profile} -level ${defaultEnc.level} -preset ${defaultEnc.preset} -crf ${defaultEnc.crf} -pix_fmt yuv420p -movflags +faststart -tune stillimage "${tempVideoPath}" 2>&1`;

    await execAsync(ffmpegCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });

    const firstImageName = imagesToProcess[0];
    const videoFileName = firstImageName.replace(/\.[^/.]+$/, '.mp4');
    const videoBuffer = await fs.readFile(tempVideoPath);
    // Compute content hash for cache-busting decisions
    let videoHash: string | null = null;
    try {
      videoHash = await computeFileHash(tempVideoPath);
    } catch (e) {
      console.warn('[Video Gen] failed to compute video hash', e);
      videoHash = null;
    }

    const videoUrl = await storage.uploadVideo(videoFileName, videoBuffer);

    const imagesToUpdate = imagesToProcess.length === 1 ? [imagesToProcess[0]] : imagesToProcess;

    for (const imgFilename of imagesToUpdate) {
      const durationSecondsForImage = imageDurations.get(imgFilename) ?? 20;
      const durationMs = Math.max(1, Math.round(durationSecondsForImage)) * 1000;
      const timestamp = new Date().toISOString();

      await db.upsertImageDuration({
        filename: imgFilename,
        duration_ms: durationMs,
        is_video: true,
        video_url: videoUrl,
        video_duration_ms: totalDurationEffective * 1000,
        video_hash: videoHash ?? undefined,
      });
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return res.status(200).json({
      success: true,
      videoUrl,
      videoFileName,
      duration: totalDurationEffective,
      imageCount: imagesToProcess.length,
      message: `Batch video generated successfully for ${imagesToProcess.length} image(s)`,
    });
  } catch (error) {
    console.error('[Video Gen] Error:', error);
    return res.status(500).json({
      error: 'Video generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
