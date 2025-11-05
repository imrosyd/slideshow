import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

/**
 * API endpoint for converting images to MP4 videos
 * Uses ffmpeg on the server to generate videos
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, filename, duration = 60, fps = 1, bitrate = '1000k', format = 'mp4' } = req.body;

    if (!imageUrl || !filename) {
      return res.status(400).json({ error: 'Missing imageUrl or filename' });
    }

    console.log(`🎬 Converting image to video: ${filename}`);

    // Create temp directory
    const tempDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download image from URL
    const imagePath = path.join(tempDir, `temp-${Date.now()}.jpg`);
    const videoPath = path.join(tempDir, `${filename}.${format}`);

    console.log(`📥 Downloading image from ${imageUrl}`);
    
    // Download image
    await downloadFile(imageUrl, imagePath);

    if (!fs.existsSync(imagePath)) {
      return res.status(400).json({ error: 'Failed to download image' });
    }

    console.log(`✅ Image downloaded: ${imagePath}`);

    // Convert image to video using ffmpeg
    // This creates a video where the image is displayed for the specified duration
    const ffmpegCommand = `ffmpeg -loop 1 -i "${imagePath}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -b:v ${bitrate} -r ${fps} "${videoPath}" 2>&1`;

    console.log(`⚙️ Running FFmpeg: ${ffmpegCommand}`);

    try {
      const { stdout, stderr } = await execAsync(ffmpegCommand, {
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      console.log('FFmpeg stdout:', stdout);
      if (stderr) console.log('FFmpeg stderr:', stderr);
    } catch (error: any) {
      console.error('FFmpeg error:', error.message);
      
      // Check if output file was created anyway
      if (!fs.existsSync(videoPath)) {
        throw new Error(`FFmpeg conversion failed: ${error.message}`);
      }
    }

    // Check if video was created
    if (!fs.existsSync(videoPath)) {
      return res.status(500).json({ error: 'Video conversion failed - output file not created' });
    }

    const videoSize = fs.statSync(videoPath).size;
    console.log(`✅ Video created: ${videoPath} (${(videoSize / 1024 / 1024).toFixed(2)} MB)`);

    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);

    // Set response headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', videoBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Send video
    res.send(videoBuffer);

    // Cleanup temp files
    setTimeout(() => {
      try {
        fs.unlinkSync(imagePath);
        fs.unlinkSync(videoPath);
        console.log('🗑️ Temp files cleaned up');
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 5000); // Wait 5 seconds before cleanup

  } catch (error: any) {
    console.error('❌ Conversion error:', error);
    res.status(500).json({
      error: 'Video conversion failed',
      details: error.message
    });
  }
}

/**
 * Helper function to download file from URL
 */
function downloadFile(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, filepath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file if error
        reject(err);
      });
    }).on('error', reject);
  });
}
