import { useState, useCallback, useRef } from 'react';

interface UseVideoPreloadProps {
  slides: any[];
  currentIndex: number;
  preloadTriggerPercent?: number;
}

interface UseVideoPreloadReturn {
  nextVideoReady: boolean;
  preloadNextVideo: () => void;
  resetPreloadFlag: () => void;
  handleTimeUpdate: (currentTime: number, duration: number) => void;
}

/**
 * Smart preload hook - preloads next video at 50% of current video
 * Prevents blank screens during transitions
 */
export function useVideoPreload({
  slides,
  currentIndex,
  preloadTriggerPercent = 0.5,
}: UseVideoPreloadProps): UseVideoPreloadReturn {
  const [nextVideoReady, setNextVideoReady] = useState(false);
  const hasTriggeredPreloadRef = useRef(false);
  const nextVideoRef = useRef<HTMLVideoElement | null>(null);

  // Reset preload flag when slide changes
  const resetPreloadFlag = useCallback(() => {
    hasTriggeredPreloadRef.current = false;
    setNextVideoReady(false);
  }, []);

  // Preload next video
  const preloadNextVideo = useCallback(() => {
    if (slides.length <= 1) return;
    if (hasTriggeredPreloadRef.current) return;

    const nextIndex = (currentIndex + 1) % slides.length;
    const nextSlide = slides[nextIndex];

    if (!nextSlide?.videoUrl) return;

    hasTriggeredPreloadRef.current = true;
    console.log(`📥 Preloading next video [${nextIndex + 1}/${slides.length}]`);

    // Create hidden video element to preload
    if (!nextVideoRef.current) {
      nextVideoRef.current = document.createElement('video');
      nextVideoRef.current.preload = 'auto';
      nextVideoRef.current.muted = true;
      nextVideoRef.current.style.display = 'none';
      document.body.appendChild(nextVideoRef.current);
    }

    nextVideoRef.current.src = nextSlide.videoUrl;

    const handleCanPlay = () => {
      console.log(`✅ Next video ready [${nextIndex + 1}/${slides.length}]`);
      setNextVideoReady(true);
      nextVideoRef.current?.removeEventListener('canplaythrough', handleCanPlay);
    };

    nextVideoRef.current.addEventListener('canplaythrough', handleCanPlay);

    // Also set ready on canplay (backup)
    nextVideoRef.current.addEventListener('canplay', () => {
      if (!nextVideoReady) {
        console.log(`✅ Next video ready (canplay) [${nextIndex + 1}/${slides.length}]`);
        setNextVideoReady(true);
      }
    }, { once: true });

  }, [slides, currentIndex, nextVideoReady]);

  // Handle time update to trigger preload at specified percentage
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (hasTriggeredPreloadRef.current) return;
    if (duration <= 0) return;

    const percentComplete = currentTime / duration;
    if (percentComplete >= preloadTriggerPercent) {
      console.log(`📊 ${Math.floor(percentComplete * 100)}% reached - triggering preload`);
      preloadNextVideo();
    }
  }, [preloadTriggerPercent, preloadNextVideo]);

  return {
    nextVideoReady,
    preloadNextVideo,
    resetPreloadFlag,
    handleTimeUpdate,
  };
}
