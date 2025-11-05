/**
 * Client-side Image to Video Conversion
 * Fallback method using Canvas API and MediaRecorder
 * 
 * This creates a video by rendering image on canvas with slight animations
 * to ensure TV keeps awake during playback
 */

export interface CanvasVideoOptions {
  duration?: number; // Duration in seconds (default: 60)
  width?: number; // Canvas width (default: 1920)
  height?: number; // Canvas height (default: 1080)
  fps?: number; // Frames per second (default: 2)
  codec?: string; // MIME type (default: 'video/webm;codecs=vp9')
}

/**
 * Convert image to video using Canvas + MediaRecorder
 */
export const generateVideoFromImageClient = async (
  imageSrc: string,
  options: CanvasVideoOptions = {}
): Promise<Blob> => {
  const {
    duration = 60,
    width = 1920,
    height = 1080,
    fps = 2,
    codec = 'video/webm'
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('🖼️ Image loaded, starting canvas recording');
        recordCanvasToVideo(img, width, height, duration, fps, codec, resolve, reject);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = imageSrc;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Record canvas to video using MediaRecorder
 */
function recordCanvasToVideo(
  image: HTMLImageElement,
  width: number,
  height: number,
  duration: number,
  fps: number,
  codec: string,
  resolve: (blob: Blob) => void,
  reject: (error: Error) => void
) {
  try {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Get video stream from canvas
    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : null;

    if (!stream) {
      reject(new Error('Canvas.captureStream not supported'));
      return;
    }

    // Create MediaRecorder
    let mimeType = codec;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      // Fallback to supported codec
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
    }

    console.log(`🎬 Recording with codec: ${mimeType}`);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1000000 // 1 Mbps
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      console.log(`✅ Video recorded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      resolve(blob);
    };

    recorder.onerror = (error) => {
      reject(new Error(`Recording error: ${error.error}`));
    };

    // Start recording
    recorder.start();
    console.log(`⏹️ Recording started for ${duration} seconds at ${fps} FPS`);

    // Draw frames
    let frameCount = 0;
    const totalFrames = duration * fps;
    const frameInterval = 1000 / fps;

    const drawFrame = () => {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Calculate scaling to fit image in canvas
      const scale = Math.max(width / image.width, height / image.height);
      const x = (width - image.width * scale) / 2;
      const y = (height - image.height * scale) / 2;

      // Draw image with slight zoom animation for keep-awake effect
      const zoomFactor = 1 + (Math.sin(frameCount / totalFrames * Math.PI * 2) * 0.01); // Subtle zoom
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomFactor, zoomFactor);
      ctx.translate(-width / 2, -height / 2);
      ctx.drawImage(image, x, y, image.width * scale, image.height * scale);
      ctx.restore();

      frameCount++;

      if (frameCount < totalFrames) {
        setTimeout(drawFrame, frameInterval);
      } else {
        // Stop recording
        recorder.stop();
      }
    };

    drawFrame();
  } catch (error) {
    reject(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Download video blob to file
 */
export const downloadVideo = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Upload video blob to server
 */
export const uploadVideoBlob = async (
  blob: Blob,
  filename: string
): Promise<Response> => {
  const formData = new FormData();
  formData.append('file', blob, filename);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  return response;
};
