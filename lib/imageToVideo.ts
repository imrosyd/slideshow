/**
 * Image to Video Conversion Utility
 * 
 * Converts static images to MP4 video format for better LG TV keep-awake
 * Uses server-side ffmpeg for high quality conversion
 * 
 * Benefits:
 * - Video playback keeps TV awake better than static images
 * - Continuous motion prevents screensaver activation
 * - Native video codec support on LG TVs
 */

export interface ImageToVideoOptions {
  duration?: number; // Video duration in seconds (default: 60)
  fps?: number; // Frames per second (default: 1 for static image)
  bitrate?: string; // Video bitrate (default: '1000k')
  format?: 'mp4' | 'webm' | 'mov'; // Output format (default: 'mp4')
}

/**
 * Convert image to video on server side
 * @param imageUrl - URL or path to the image
 * @param options - Conversion options
 * @returns Promise with video blob or URL
 */
export const convertImageToVideo = async (
  imageUrl: string,
  filename: string,
  options: ImageToVideoOptions = {}
): Promise<Response> => {
  const {
    duration = 60,
    fps = 1,
    bitrate = '1000k',
    format = 'mp4'
  } = options;

  try {
    // Call server API for conversion
    const response = await fetch('/api/convert-image-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        filename,
        duration,
        fps,
        bitrate,
        format
      })
    });

    if (!response.ok) {
      throw new Error(`Conversion failed: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error('Error converting image to video:', error);
    throw error;
  }
};

/**
 * Convert multiple images to videos
 */
export const convertImagesToVideos = async (
  imageUrls: string[],
  options: ImageToVideoOptions = {}
): Promise<Response[]> => {
  const results = await Promise.allSettled(
    imageUrls.map((url, index) => 
      convertImageToVideo(url, `video-${index}`, options)
    )
  );

  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<Response>).value);
};

/**
 * Generate video metadata for slideshow
 */
export const generateVideoMetadata = (
  videoUrl: string,
  durationSeconds: number
) => {
  return {
    type: 'video',
    url: videoUrl,
    format: 'mp4',
    duration: durationSeconds * 1000, // Convert to milliseconds
    codec: 'h264',
    createdAt: new Date().toISOString()
  };
};

/**
 * Check if file is video
 */
export const isVideoFile = (filename: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return videoExtensions.includes(ext);
};

/**
 * Check if file is image
 */
export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return imageExtensions.includes(ext);
};
