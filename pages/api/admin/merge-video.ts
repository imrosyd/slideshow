import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type ImageInput = {
  filename: string;
  durationSeconds: number;
};

type RequestBody = {
  images: ImageInput[];
  outputFilename: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { images, outputFilename }: RequestBody = req.body;

  if (!images || !Array.isArray(images) || images.length < 2) {
    return res.status(400).json({ error: "At least 2 images required" });
  }

  if (!outputFilename) {
    return res.status(400).json({ error: "Output filename required" });
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "merge-video-"));
  const tempFiles: string[] = [];

  try {
    console.log(`[Merge Video] Starting merge of ${images.length} images`);

    // Download all images from Supabase
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const { data, error } = await supabase.storage
        .from("slideshow-images")
        .download(img.filename);

      if (error || !data) {
        throw new Error(`Failed to download ${img.filename}: ${error?.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const tempImagePath = path.join(tempDir, `image_${i}.jpg`);
      await fs.writeFile(tempImagePath, buffer);
      tempFiles.push(tempImagePath);
      console.log(`[Merge Video] Downloaded ${img.filename} (${img.durationSeconds}s)`);
    }

    // Create FFmpeg concat file
    const concatFilePath = path.join(tempDir, "concat.txt");
    const concatContent = images
      .map((img, i) => {
        const tempImagePath = path.join(tempDir, `image_${i}.jpg`);
        // Each image repeated for its duration at 1fps
        return `file '${tempImagePath}'\nduration ${img.durationSeconds}`;
      })
      .join("\n");
    
    // Add last image one more time without duration (FFmpeg concat requirement)
    const lastImagePath = path.join(tempDir, `image_${images.length - 1}.jpg`);
    const finalConcatContent = concatContent + `\nfile '${lastImagePath}'`;
    
    await fs.writeFile(concatFilePath, finalConcatContent);
    console.log(`[Merge Video] Concat file created with ${images.length} images`);

    // Get encoding settings from database (same as generate-video)
    const defaultEnc = {
      fps: 30,
      gop: 60,
      profile: 'high' as 'baseline' | 'main' | 'high',
      level: '4.0',
      preset: 'medium' as 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow',
      crf: 23,
      width: 1920,
      height: 1080,
    };

    try {
      const { data: encRows, error: encErr } = await supabase
        .from('slideshow_settings')
        .select('key,value')
        .in('key', [
          'video_fps',
          'video_gop',
          'video_profile',
          'video_level',
          'video_preset',
          'video_crf',
          'video_width',
          'video_height',
        ]);

      if (!encErr && encRows && encRows.length > 0) {
        const map = new Map<string, string>(encRows.map(r => [r.key, r.value]));
        const fps = parseInt(map.get('video_fps') || '', 10);
        if (!Number.isNaN(fps) && fps >= 15 && fps <= 60) defaultEnc.fps = fps;
        const gop = parseInt(map.get('video_gop') || '', 10);
        if (!Number.isNaN(gop) && gop >= defaultEnc.fps && gop <= defaultEnc.fps * 10) defaultEnc.gop = gop;
        const profile = (map.get('video_profile') || '').toLowerCase();
        if (['baseline','main','high'].includes(profile)) defaultEnc.profile = profile as any;
        const level = map.get('video_level') || '';
        if (/^\d(\.\d)?$/.test(level)) defaultEnc.level = level;
        const preset = (map.get('video_preset') || '').toLowerCase();
        if (['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow'].includes(preset)) defaultEnc.preset = preset as any;
        const crf = parseInt(map.get('video_crf') || '', 10);
        if (!Number.isNaN(crf) && crf >= 15 && crf <= 35) defaultEnc.crf = crf;
        const width = parseInt(map.get('video_width') || '', 10);
        if (!Number.isNaN(width) && width >= 320 && width <= 3840) defaultEnc.width = width;
        const height = parseInt(map.get('video_height') || '', 10);
        if (!Number.isNaN(height) && height >= 240 && height <= 2160) defaultEnc.height = height;
        if (!map.get('video_gop')) defaultEnc.gop = defaultEnc.fps * 2;
      }
      console.log(`[Merge Video] Encoder config -> fps=${defaultEnc.fps}, gop=${defaultEnc.gop}, profile=${defaultEnc.profile}, level=${defaultEnc.level}, preset=${defaultEnc.preset}, crf=${defaultEnc.crf}, scale=${defaultEnc.width}x${defaultEnc.height}`);
    } catch (e) {
      console.log(`[Merge Video] Using default encoder config: ${e}`);
    }

    // Generate merged video
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

      console.log(`[Merge Video] FFmpeg command: ${ffmpegPath.path} ${args.join(" ")}`);

      const ffmpeg = spawn(ffmpegPath.path, args);
      let stderr = "";

      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log(`[Merge Video] Video created successfully`);
          resolve();
        } else {
          console.error(`[Merge Video] FFmpeg error:\n${stderr}`);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        console.error(`[Merge Video] Spawn error:`, err);
        reject(err);
      });
    });

    // Upload merged video to Supabase
    const videoBuffer = await fs.readFile(outputPath);
    const videoFilename = outputFilename.endsWith(".mp4") ? outputFilename : `${outputFilename}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("slideshow-videos")
      .upload(videoFilename, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    console.log(`[Merge Video] Uploaded ${videoFilename} successfully`);

    // Get public URL for the video
    const { data: videoPublicData } = supabase.storage
      .from("slideshow-videos")
      .getPublicUrl(videoFilename);

    const videoUrl = videoPublicData.publicUrl;
    console.log(`[Merge Video] Video URL: ${videoUrl}`);

    // DELETE individual videos before merge
    console.log(`[Merge Video] Deleting ${images.length} individual videos before merge...`);
    for (const image of images) {
      try {
        // Find database entry for this image
        const { data: existingData } = await supabase
          .from("image_durations")
          .select('filename, video_url')
          .eq('filename', image.filename)
          .single();

        if (existingData?.video_url) {
          // Delete video from storage
          const videoStoragePath = existingData.video_url.replace(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-videos/`, '');
          const { error: deleteError } = await supabase.storage
            .from('slideshow-videos')
            .remove([videoStoragePath]);

          if (deleteError) {
            console.warn(`[Merge Video] Failed to delete video for ${image.filename}:`, deleteError.message);
          } else {
            console.log(`[Merge Video] Deleted individual video: ${image.filename}`);
          }

          // Update database to remove video metadata
          const { error: updateError } = await supabase
            .from('image_durations')
            .update({ 
              filename: image.filename,
              video_url: null,
              video_generated_at: null,
              video_duration_seconds: null
            })
            .eq('filename', image.filename);

          if (updateError) {
            console.warn(`[Merge Video] Failed to update database for ${image.filename}:`, updateError.message);
          } else {
            console.log(`[Merge Video] Removed video metadata for ${image.filename}`);
          }
        }
      } catch (error) {
        console.error(`[Merge Video] Error deleting video for ${image.filename}:`, error);
        continue; // Continue with next image
      }
    }

    // Calculate total duration
    const totalDuration = images.reduce((sum, img) => sum + img.durationSeconds, 0);

    // Create a placeholder black image for the gallery
    const placeholderImageName = videoFilename.replace('.mp4', '.jpg');
    
    // Generate a simple black placeholder image using FFmpeg
    const placeholderPath = path.join(tempDir, 'placeholder.jpg');
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-f', 'lavfi',
        '-i', 'color=c=black:s=1920x1080:d=1',
        '-frames:v', '1',
        '-y',
        placeholderPath
      ];

      const ffmpeg = spawn(ffmpegPath.path, args);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg placeholder failed with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });

    // Upload placeholder image to storage to maintain consistency
    console.log(`[Merge Video] Uploading placeholder image: ${placeholderImageName}`);
    
    // Read the generated placeholder image
    const placeholderBuffer = await fs.readFile(placeholderPath);
    
    // Upload to slideshow-images bucket
    const { error: placeholderUploadError } = await supabase.storage
      .from("slideshow-images")
      .upload(placeholderImageName, placeholderBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (placeholderUploadError) {
      console.error(`[Merge Video] Failed to upload placeholder image:`, placeholderUploadError);
      throw new Error(`Failed to upload placeholder image: ${placeholderUploadError.message}`);
    }
    
    // Get public URL for the placeholder
    const { data: placeholderPublicData } = supabase.storage
      .from("slideshow-images")
      .getPublicUrl(placeholderImageName);
    
    const placeholderUrl = placeholderPublicData.publicUrl;
    console.log(`[Merge Video] Placeholder image uploaded: ${placeholderUrl}`);

    // Create metadata entry for the merged video
    const { error: metadataError } = await supabase
      .from("image_durations")
      .upsert({
        filename: placeholderImageName,
        duration_ms: totalDuration * 1000,
        caption: `Merged: ${images.length} images (${totalDuration}s)`,
        order_index: 999999, // Put at end
        hidden: true, // Hide placeholder image, only show video
        is_video: true, // Mark as video entry
        video_url: videoUrl, // Use full public URL instead of filename
        video_generated_at: new Date().toISOString(),
        video_duration_seconds: totalDuration,
      }, {
        onConflict: "filename"
      });

    if (metadataError) {
      console.error(`[Merge Video] Failed to create metadata:`, metadataError);
      // Don't fail the whole operation, video is already uploaded
    } else {
      console.log(`[Merge Video] Metadata created for ${placeholderImageName}`);
    }

    // Broadcast video update to all main page viewers
    try {
      const { data } = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const channel = data.channel('video-updates');
      await channel.send({
        type: 'broadcast',
        event: 'video-updated',
        payload: {
          slideName: placeholderImageName, // Send placeholder name for identification
          videoUrl: videoUrl,
          videoDurationSeconds: totalDuration,
          action: 'created'
        }
      }, { httpSend: true });
      
      console.log(`[Merge Video] Broadcast: Created merged video to main pages - ${videoFilename}`);
    } catch (broadcastError) {
      console.warn('[Merge Video] Failed to broadcast video update:', broadcastError);
    }

    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true });

    const result = {
      success: true,
      filename: videoFilename,
      imageCount: images.length,
      mainPage: true, // Indicate this will display on main page
      totalDuration,
      deletedVideos: images.length,
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error("[Merge Video] Error:", error);
    
    // Clean up on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to merge video"
    });
  }
}
