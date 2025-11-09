import { useEffect, useRef } from 'react';

/**
 * Hook to ensure single video loops seamlessly without gaps
 * Addresses the delay between video end and restart
 */
export function useSingleVideoLoop(videoRef: React.RefObject<HTMLVideoElement>) {
  const lastEndTime = useRef<number>(0);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      const now = Date.now();
      const gap = now - lastEndTime.current;
      
      // Only restart if gap is minimal (to prevent multiple restarts)
      if (gap > 1000) { // More than 1 second gap
        console.log('🔁 Single video ended - restarting');
        video.currentTime = 0;
        video.play().catch(e => console.error('Failed to restart single video:', e));
        lastEndTime.current = now;
      } else {
        // Too many restarts in short time, let HTML5 loop handle it
        console.log('🔁 Single video ended (HTML5 loop)');
      }
    };
    
    const handleTimeUpdate = () => {
      // Check if we're near the end (within 100ms)
      if (video.duration && video.currentTime) {
        const timeRemaining = video.duration - video.currentTime;
        if (timeRemaining <= 0.1 && timeRemaining > 0) {
          // We're approaching the end, clear the loop flag
          video.loop = false;
        } else if (timeRemaining > 0.11) {
          // We're not near the end, ensure loop is enabled
          video.loop = true;
        }
      }
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef]);
}

export default useSingleVideoLoop;
