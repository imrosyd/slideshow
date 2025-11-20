import { useRef, useCallback, useEffect } from 'react';

interface UseVideoPlayerProps {
  videoUrl: string | null;
  isPaused: boolean;
  onEnded: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  play: (resetPosition?: boolean) => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
}

/**
 * Clean video player hook - handles video element lifecycle
 * Optimized for webOS low-spec devices
 */
export function useVideoPlayer({
  videoUrl,
  isPaused,
  onEnded,
  onTimeUpdate,
}: UseVideoPlayerProps): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playAttemptsRef = useRef(0);

  // Play with retry logic for webOS
  const play = useCallback(async (resetPosition = true) => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    playAttemptsRef.current = 0;

    const attemptPlay = async (attempt = 1): Promise<void> => {
      try {
        // Only reset to beginning if explicitly requested (new video or slide change)
        if (resetPosition) {
          video.currentTime = 0;
        }
        await video.play();
        console.log(`✅ Play success (attempt ${attempt})${resetPosition ? ' from start' : ' resumed'}`);
        playAttemptsRef.current = 0;
      } catch (error: any) {
        // Ignore AbortError which happens when play is interrupted by a new load request
        if (error.name === 'AbortError') {
          console.log('ℹ️ Play interrupted by new load request (harmless)');
          return;
        }

        console.error(`❌ Play failed (attempt ${attempt}):`, error);

        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
          return attemptPlay(attempt + 1);
        }

        throw error;
      }
    };

    return attemptPlay();
  }, [videoUrl]);

  // Pause video
  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    console.log('⏸️ Video paused');
  }, []);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
  }, []);

  // Track if video URL has changed
  const previousVideoUrlRef = useRef<string | null>(null);

  // Handle pause/play state changes
  useEffect(() => {
    if (isPaused) {
      pause();
    } else if (videoUrl) {
      // Only reset position if video URL changed (new video)
      const isNewVideo = previousVideoUrlRef.current !== videoUrl;
      previousVideoUrlRef.current = videoUrl;

      play(isNewVideo).catch(e => console.error('Failed to play:', e));
    }
  }, [isPaused, videoUrl, play, pause]);

  // Setup video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      console.log('🎬 Video ended');
      onEnded();
    };

    const handleTimeUpdate = () => {
      if (onTimeUpdate && video.duration > 0) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onEnded, onTimeUpdate]);

  return {
    videoRef,
    play,
    pause,
    seek,
  };
}
