import { useEffect } from 'react';
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
  adminImages?: Array<{name: string; url: string}>;
  handleImageClick?: (image: {name: string; url: string}) => void;
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
  adminImages,
  handleImageClick,
}: UseRemoteControlProps) {
  
  // Listen for remote control commands
  useEffect(() => {
    console.log('🔌 Setting up remote control listener');
    
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
          case 'show-image':
            if (data?.name && data?.url && adminImages && handleImageClick) {
              // Find the image in adminImages to ensure it exists
              const image = adminImages.find(img => img.name === data.name);
              console.log('🔍 Remote show-image command received:', { name: data.name });
              console.log('📋 Available adminImages:', adminImages.map(img => ({ name: img.name, url: img.url })));
              console.log('🔍 Looking for image:', data.name);
              if (image) {
                console.log('✅ Found match! Calling handleImageClick for:', image.name);
                handleImageClick(image);
              } else {
                console.warn('❌ Image not found in adminImages for:', data.name);
              }
            }
            break;
          case 'close-overlay':
            // Close the image overlay on main page
            console.log('🖼️ Remote close-overlay command received');
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            window.dispatchEvent(event);
            break;
        }
      })
      .on('broadcast', { event: 'request-status' }, () => {
        // Send current status to remote when requested
        console.log('📡 Status requested - sending:', { total: slides.length, current: currentIndex });
        remoteChannel.send({
          type: 'broadcast',
          event: 'slideshow-status',
          payload: {
            total: slides.length,
            current: currentIndex,
            currentImage: slides[currentIndex]?.name || '',
            paused: isPaused,
          }
        }, { httpSend: true });
      })
      .subscribe();

    return () => {
      console.log('🔌 Removing remote control channel');
      supabase.removeChannel(remoteChannel);
    };
  }, [slides, currentIndex, isPaused, goToNext, goToPrevious, goToSlide, togglePause, fetchSlides]);

  // Broadcast status updates when state changes
  useEffect(() => {
    if (slides.length === 0) return; // Don't broadcast if no slides
    
    console.log('📡 Broadcasting status update');
    
    const remoteChannel = supabase.channel('remote-control-status');
    
    remoteChannel.send({
      type: 'broadcast',
      event: 'slideshow-status',
      payload: {
        total: slides.length,
        current: currentIndex,
        currentImage: slides[currentIndex]?.name || '',
        paused: isPaused,
      }
    }, { httpSend: true }).catch(() => {
      // Ignore send errors
    });

    return () => {
      supabase.removeChannel(remoteChannel);
    };
  }, [slides.length, currentIndex, isPaused]);
  
  // Periodic status broadcast (every 5 seconds) to ensure remote stays connected
  useEffect(() => {
    if (slides.length === 0) return;
    
    const interval = setInterval(() => {
      console.log('⏰ Periodic status broadcast');
      
      const channel = supabase.channel('remote-control-heartbeat');
      channel.send({
        type: 'broadcast',
        event: 'slideshow-status',
        payload: {
          total: slides.length,
          current: currentIndex,
          currentImage: slides[currentIndex]?.name || '',
          paused: isPaused,
        }
      }, { httpSend: true }).then(() => {
        supabase.removeChannel(channel);
      }).catch(() => {
        supabase.removeChannel(channel);
      });
    }, 5000); // Every 5 seconds
    
    return () => clearInterval(interval);
  }, [slides.length, currentIndex, isPaused]);
}
