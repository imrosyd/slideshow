import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const execAsync = promisify(exec);
const ffmpegPath = ffmpegInstaller.path;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VideoImageData {
  filename: string;
  durationSeconds: number;
}

interface GenerateVideoRequest {
  filenames?: string[]; // For batch generation (legacy)
  filename?: string;    // For single file (backward compat)
  durationSeconds?: number; // For batch generation (legacy)
  videoData?: VideoImageData[]; // New: per-image durations
}

/**
 * Download file from URL
 */
function downloadFile(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadFile(redirectUrl, filepath).then(resolve).catch(reject);
            return;
          }
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      })
      .on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filenames, filename, durationSeconds, videoData } = req.body as GenerateVideoRequest;
  
  // Handle new format: per-image durations
  let imagesToProcess: string[] = [];
  let imageDurations: Map<string, number> = new Map();
  let totalDurationSeconds: number = 0;

  if (videoData && Array.isArray(videoData) && videoData.length > 0) {
    // New format: per-image durations
    imagesToProcess = videoData.map(v => v.filename);
    videoData.forEach(v => {
      imageDurations.set(v.filename, v.durationSeconds);
      totalDurationSeconds += v.durationSeconds;
    });
    console.log(`[Video Gen] Using per-image durations for ${imagesToProcess.length} images, total: ${totalDurationSeconds}s`);
  } else {
    // Legacy format: filenames array or single filename
    imagesToProcess = filenames && filenames.length > 0 ? filenames : (filename ? [filename] : []);
    
    if (imagesToProcess.length === 0 || !durationSeconds) {
      return res.status(400).json({ error: 'Missing required fields: (videoData) OR (filenames/filename + durationSeconds)' });
    }

    // Legacy: distribute total duration evenly
    const durationPerImage = Math.max(1, Math.floor(durationSeconds! / imagesToProcess.length));
    const remainder = durationSeconds! - (durationPerImage * imagesToProcess.length);
    
    imagesToProcess.forEach((img, idx) => {
      const duration = idx === 0 ? durationPerImage + remainder : durationPerImage;
      imageDurations.set(img, duration);
    });
    totalDurationSeconds = durationSeconds!;
    console.log(`[Video Gen] Using legacy format: distributing ${totalDurationSeconds}s among ${imagesToProcess.length} images`);
  }

  if (imagesToProcess.length === 0) {
    return res.status(400).json({ error: 'No images to process' });
  }

  console.log(`[Video Gen] Starting video generation for ${imagesToProcess.length} image(s) with total duration ${totalDurationSeconds}s`);

  try {
    // Check if video already exists for single image generation
    if (imagesToProcess.length === 1) {
      const imageName = imagesToProcess[0];
      const videoFileName = imageName.replace(/\.[^/.]+$/, '.mp4');
      
      // Check database first
      const { data: existingData, error: checkError } = await supabase
        .from('image_durations')
        .select('is_video, video_url')
        .eq('filename', imageName)
        .single();

      // Also check if video file exists in storage
      const { data: existingFiles } = await supabase
        .storage
        .from('slideshow-videos')
        .list('', { search: videoFileName });

      const videoExists = existingFiles && existingFiles.length > 0;

      if (!checkError && existingData && existingData.is_video && existingData.video_url) {
        console.log(`[Video Gen] Video already exists in database for ${imageName}, skipping generation`);
        return res.status(200).json({
          success: true,
          videoUrl: existingData.video_url,
          message: 'Video already exists in database',
          alreadyExists: true,
        });
      }

      if (videoExists) {
        console.log(`[Video Gen] Video file already exists in storage for ${imageName}, will overwrite with upsert`);
      }
    }

    // Create temp directory
    const tempDir = path.join('/tmp', 'slideshow-video-gen-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Log duration info
    console.log(`[Video Gen] Total images: ${imagesToProcess.length}`);
    console.log(`[Video Gen] Total video duration: ${totalDurationSeconds}s`);
    
    imagesToProcess.forEach((img, idx) => {
      const imgDuration = imageDurations.get(img) || 0;
      console.log(`[Video Gen] Image ${idx + 1}: ${img} (${imgDuration}s)`);
    });

    // 1. Download all images
    console.log(`[Video Gen] Downloading ${imagesToProcess.length} image(s)...`);
    const imagePaths: string[] = [];
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgFilename = imagesToProcess[i];
      const tempImagePath = path.join(tempDir, `image-${i}.jpg`);
      
      try {
        const { data: publicData } = supabase
          .storage
          .from('slideshow-images')
          .getPublicUrl(imgFilename);

        const imageUrl = publicData.publicUrl;
        console.log(`[Video Gen] Image ${i + 1}/${imagesToProcess.length}: ${imgFilename}`);
        
        await downloadFile(imageUrl, tempImagePath);

        if (!fs.existsSync(tempImagePath)) {
          throw new Error(`Failed to download image ${i}: ${imgFilename}`);
        }

        const imageSize = fs.statSync(tempImagePath).size;
        console.log(`[Video Gen]   Downloaded: ${(imageSize / 1024).toFixed(2)} KB`);
        imagePaths.push(tempImagePath);
      } catch (err) {
        console.error(`[Video Gen] Error downloading image ${i}:`, err);
        throw err;
      }
    }

    // 2. Build FFmpeg command with looped images for each duration
    const tempVideoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
    console.log(`[Video Gen] Running FFmpeg with looped images...`);
    
    // Build input commands for all images with loop and framerate
    // -loop 1: Loop the image
    // -framerate 24: 24 fps
    // -t <duration>: Display for this many seconds
    let ffmpegCmd = `"${ffmpegPath}"`;
    
    console.log(`[Video Gen] Using FFmpeg from: ${ffmpegPath}`);
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imgFilename = imagesToProcess[i];
      const imageDuration = imageDurations.get(imgFilename) || 0;
      ffmpegCmd += ` -loop 1 -framerate 24 -t ${imageDuration} -i "${imagePaths[i]}"`;
      console.log(`[Video Gen] FFmpeg Input ${i + 1}: ${imageDuration}s`);
    }
    
    // Concat all videos and apply scale filter
    const inputCount = imagePaths.length;
    let filterComplex = '';
    
    for (let i = 0; i < inputCount; i++) {
      filterComplex += `[${i}:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[v${i}];`;
    }
    
    filterComplex += inputCount === 1 
      ? `[v0]format=yuv420p[out]`
      : Array.from({ length: inputCount }, (_, i) => `[v${i}]`).join('') + `concat=n=${inputCount}:v=1:a=0,format=yuv420p[out]`;
    
    ffmpegCmd += ` -filter_complex "${filterComplex}" -map "[out]" -c:v libx264 -pix_fmt yuv420p -b:v 1500k -r 24 "${tempVideoPath}" 2>&1`;

    console.log(`[Video Gen] FFmpeg Command: ${ffmpegCmd.substring(0, 300)}...`);

    const { stdout, stderr } = await execAsync(ffmpegCmd, {
      timeout: 600000, // 10 minutes for batch
      maxBuffer: 50 * 1024 * 1024,
    });

    console.log(`[Video Gen] FFmpeg output: ${stdout.substring(0, 1500)}`);

    if (!fs.existsSync(tempVideoPath)) {
      throw new Error('FFmpeg failed to create video file');
    }

    const videoSize = fs.statSync(tempVideoPath).size;
    console.log(`[Video Gen] Video created: ${(videoSize / 1024 / 1024).toFixed(2)} MB`);

    // 4. Upload video to Supabase Storage
    // Use image name as video name (without timestamp) to prevent duplicates
    const firstImageName = imagesToProcess[0];
    const videoFileName = firstImageName.replace(/\.[^/.]+$/, '.mp4'); // Replace image extension with .mp4
    console.log(`[Video Gen] Uploading video to storage: ${videoFileName}`);

    const videoBuffer = fs.readFileSync(tempVideoPath);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('slideshow-videos')
      .upload(videoFileName, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: true, // Replace existing video if it exists
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log(`[Video Gen] Video uploaded: ${videoFileName}`);

    // 5. Get public video URL
    const { data: videoPublicData } = supabase
      .storage
      .from('slideshow-videos')
      .getPublicUrl(videoFileName);

    const videoUrl = videoPublicData.publicUrl;
    console.log(`[Video Gen] Video URL: ${videoUrl}`);

    // 6. Update database for all processed images
    console.log(`[Video Gen] Updating database for ${imagesToProcess.length} image(s)...`);

    for (const imgFilename of imagesToProcess) {
      const durationSecondsForImage = imageDurations.get(imgFilename) ?? 20;
      const durationMs = Math.max(1, Math.round(durationSecondsForImage)) * 1000;
      const timestamp = new Date().toISOString();

      const { data: updatedRows, error: updateError } = await supabase
        .from('image_durations')
        .update({
          is_video: true,
          video_url: videoUrl,
          video_duration_seconds: totalDurationSeconds,
          video_generated_at: timestamp,
          updated_at: timestamp,
        })
        .eq('filename', imgFilename)
        .select('filename');

      if (updateError) {
        console.error(`[Video Gen] Database update error for ${imgFilename}:`, updateError);
        throw new Error(`Database update failed for ${imgFilename}: ${updateError.message}`);
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.log(`[Video Gen] No existing metadata for ${imgFilename}, inserting new row.`);
        const { error: insertError } = await supabase
          .from('image_durations')
          .insert({
            filename: imgFilename,
            duration_ms: durationMs,
            caption: null,
            order_index: imagesToProcess.indexOf(imgFilename),
            hidden: false,
            is_video: true,
            video_url: videoUrl,
            video_duration_seconds: totalDurationSeconds,
            video_generated_at: timestamp,
            updated_at: timestamp,
          });

        if (insertError) {
          console.error(`[Video Gen] Database insert error for ${imgFilename}:`, insertError);
          throw new Error(`Database insert failed for ${imgFilename}: ${insertError.message}`);
        }
      }
    }

    // 7. Cleanup temp files
    console.log(`[Video Gen] Cleaning up temp files...`);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.log(`[Video Gen] Cleanup warning: ${e}`);
    }

    console.log(`[Video Gen] ✅ Batch video generation complete!`);

    return res.status(200).json({
      success: true,
      videoUrl,
      videoFileName,
      duration: totalDurationSeconds,
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
