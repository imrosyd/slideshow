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

    // Generate merged video
    const outputPath = path.join(tempDir, "output.mp4");

    await new Promise<void>((resolve, reject) => {
      const args = [
        "-f", "concat",
        "-safe", "0",
        "-i", concatFilePath,
        "-vsync", "vfr",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
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

    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true });

    return res.status(200).json({
      success: true,
      filename: videoFilename,
      imageCount: images.length,
    });

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
