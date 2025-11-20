import { useState, useCallback, useRef, useEffect } from 'react';

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
 * SIMPLIFIED: Just marks as ready, no actual preload element (let browser handle it)
 */
export function useVideoPreload({
  slides,
  currentIndex,
  preloadTriggerPercent = 0.5,
}: UseVideoPreloadProps): UseVideoPreloadReturn {
  const [nextVideoReady, setNextVideoReady] = useState(false);
  const hasTriggeredPreloadRef = useRef(false);

  // Reset preload flag when slide changes
  const resetPreloadFlag = useCallback(() => {
    hasTriggeredPreloadRef.current = false;
    setNextVideoReady(false);
  }, []);

  // Reset on index change
  useEffect(() => {
    resetPreloadFlag();
  }, [currentIndex, resetPreloadFlag]);

  // Preload next video - SIMPLIFIED: just mark as ready
  const preloadNextVideo = useCallback(() => {
    if (slides.length <= 1) return;
    if (hasTriggeredPreloadRef.current) return;

    const nextIndex = (currentIndex + 1) % slides.length;
    hasTriggeredPreloadRef.current = true;

    // Just mark as ready - let the video element handle preload with preload="auto"
    setNextVideoReady(true);

  }, [slides, currentIndex]);

  // Handle time update to trigger preload at specified percentage
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (hasTriggeredPreloadRef.current) return;
    if (duration <= 0) return;

    const percentComplete = currentTime / duration;
    if (percentComplete >= preloadTriggerPercent) {
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
