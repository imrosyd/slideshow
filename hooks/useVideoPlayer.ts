import { useRef, useCallback, useEffect } from 'react';

interface UseVideoPlayerProps {
  videoUrl: string | null;
  isPaused: boolean;
  onEnded: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  play: () => Promise<void>;
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
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    playAttemptsRef.current = 0;
    
    const attemptPlay = async (attempt = 1): Promise<void> => {
      try {
        await video.play();
        console.log(`✅ Play success (attempt ${attempt})`);
        playAttemptsRef.current = 0;
      } catch (error) {
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

  // Handle pause/play state changes
  useEffect(() => {
    if (isPaused) {
      pause();
    } else if (videoUrl) {
      play().catch(e => console.error('Failed to play:', e));
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
