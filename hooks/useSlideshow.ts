import { useState, useCallback, useEffect, useRef } from 'react';

interface Slide {
  name: string;
  videoUrl?: string;
  durationSeconds: number;
  isVideo?: boolean;
}

interface UseSlideshowProps {
  slides: Slide[];
  initialIndex?: number;
}

interface UseSlideshowReturn {
  currentIndex: number;
  isPaused: boolean;
  goToNext: () => void;
  goToPrevious: () => void;
  goToSlide: (index: number) => void;
  togglePause: () => void;
  pause: () => void;
  play: () => void;
  handleVideoEnded: () => void;
  currentSlide: Slide | null;
}

/**
 * Main slideshow controller
 * Manages slide navigation and playback state
 */
export function useSlideshow({
  slides,
  initialIndex = 0,
}: UseSlideshowProps): UseSlideshowReturn {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);

  const currentSlide = slides[currentIndex] || null;

  // Navigate to next slide
  const goToNext = useCallback(() => {
    if (slides.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % slides.length;
    console.log(`➡️ Next slide [${nextIndex + 1}/${slides.length}]`);
    setCurrentIndex(nextIndex);
  }, [currentIndex, slides.length]);

  // Navigate to previous slide
  const goToPrevious = useCallback(() => {
    if (slides.length === 0) return;
    
    const prevIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    console.log(`⬅️ Previous slide [${prevIndex + 1}/${slides.length}]`);
    setCurrentIndex(prevIndex);
  }, [currentIndex, slides.length]);

  // Navigate to specific slide
  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= slides.length) return;
    
    console.log(`🎯 Go to slide [${index + 1}/${slides.length}]`);
    setCurrentIndex(index);
  }, [slides.length]);

  // Toggle pause/play
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      console.log(prev ? '▶️ Resuming' : '⏸️ Pausing');
      return !prev;
    });
  }, []);

  // Explicit pause/play helpers (avoid relying on toggle flips)
  const pause = useCallback(() => {
    setIsPaused(() => {
      console.log('⏸️ Pausing (explicit)');
      return true;
    });
  }, []);

  const play = useCallback(() => {
    setIsPaused(() => {
      console.log('▶️ Playing (explicit)');
      return false;
    });
  }, []);

  // Handle video ended - go to next automatically
  const handleVideoEnded = useCallback(() => {
    if (isPaused) return;
    
    // For single slide, loop it
    if (slides.length <= 1) {
      console.log('🔁 Single slide - looping');
      return; // Video element will loop automatically
    }

    goToNext();
  }, [isPaused, slides.length, goToNext]);

  // Reset pause state when slides change
  useEffect(() => {
    setIsPaused(false);
  }, [slides.length]);

  return {
    currentIndex,
    isPaused,
    goToNext,
    goToPrevious,
    goToSlide,
    togglePause,
    pause,
    play,
    handleVideoEnded,
    currentSlide,
  };
}
