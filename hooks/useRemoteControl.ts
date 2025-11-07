import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UseRemoteControlProps {
  slides: any[];
  currentIndex: number;
  isPaused: boolean;
  goToNext: () => void;
  goToPrevious: () => void;
  goToSlide: (index: number) => void;
  togglePause: () => void;
  fetchSlides: (isAutoRefresh?: boolean) => Promise<any>;
}

/**
 * Remote control hook - handles Supabase realtime commands from remote page
 * Allows controlling the slideshow from /remote page
 */
export function useRemoteControl({
  slides,
  currentIndex,
  isPaused,
  goToNext,
  goToPrevious,
  goToSlide,
  togglePause,
  fetchSlides,
}: UseRemoteControlProps) {
  const channelRef = useRef<any>(null);
  
  // Listen for remote control commands and send status updates
  useEffect(() => {
    const remoteChannel = supabase
      .channel('remote-control')
      .on('broadcast', { event: 'remote-command' }, (payload) => {
        console.log('📱 Remote command received:', payload);
        const { command, data } = payload.payload || {};
        
        switch (command) {
          case 'previous':
            goToPrevious();
            break;
          case 'next':
            goToNext();
            break;
          case 'toggle-pause':
            togglePause();
            break;
          case 'goto':
            if (data?.index !== undefined) {
              goToSlide(data.index);
            }
            break;
          case 'restart':
            goToSlide(0);
            break;
          case 'refresh':
            fetchSlides(true);
            break;
        }
      })
      .on('broadcast', { event: 'request-status' }, () => {
        // Send current status to remote
        console.log('📡 Sending status to remote');
        remoteChannel.send({
          type: 'broadcast',
          event: 'slideshow-status',
          payload: {
            total: slides.length,
            current: currentIndex,
            currentImage: slides[currentIndex]?.name || '',
            paused: isPaused,
          }
        });
      })
      .subscribe();

    channelRef.current = remoteChannel;

    return () => {
      supabase.removeChannel(remoteChannel);
      channelRef.current = null;
    };
  }, [slides, currentIndex, isPaused, goToNext, goToPrevious, goToSlide, togglePause, fetchSlides]);

  // Broadcast status updates whenever state changes
  useEffect(() => {
    if (!channelRef.current) return;
    
    // Use the same channel that's already subscribed
    channelRef.current.send({
      type: 'broadcast',
      event: 'slideshow-status',
      payload: {
        total: slides.length,
        current: currentIndex,
        currentImage: slides[currentIndex]?.name || '',
        paused: isPaused,
      }
    }).catch((err: any) => {
      console.log('Status broadcast error (ignored):', err);
    });
  }, [slides.length, currentIndex, isPaused]);
}
