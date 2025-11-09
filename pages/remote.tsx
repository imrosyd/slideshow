import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";

export default function RemoteControl() {
  const [isConnected, setIsConnected] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  const [currentImageName, setCurrentImageName] = useState<string>("");
  const [jumpToSlide, setJumpToSlide] = useState<string>("");
  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(5000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [images, setImages] = useState<Array<{name: string; url: string}>>([]);
  const [liveImage, setLiveImage] = useState<string | null>(null); // Track which image is showing on main page
  const [isMainPageLoading, setIsMainPageLoading] = useState(true); // Track main page loading state
  const [isMainPageReady, setIsMainPageReady] = useState(false); // Track when main page has content

  useEffect(() => {
    console.log('📱 Setting up remote control channels');
    
    // Subscribe to slideshow status on ALL channels
    const commandChannel = supabase
      .channel('remote-control')
      .on('broadcast', { event: 'slideshow-status' }, (payload) => {
        console.log('Status update (command channel):', payload);
        if (payload.payload) {
          setSlideCount(payload.payload.total || 0);
          setCurrentSlide(payload.payload.current || 0);
          setIsPaused(payload.payload.paused || false);
          setCurrentImageName(payload.payload.currentImage || "");
          setIsConnected(true);
          
          // Check if main page is ready (has slides/content)
          const hasContent = payload.payload.total > 0;
          setIsMainPageLoading(false);
          setIsMainPageReady(hasContent);
          
          console.log('Main page state:', { 
            hasContent, 
            total: payload.payload.total, 
            loading: false, 
            ready: hasContent 
          });
        }
      })
      .subscribe();

    const statusChannel = supabase
      .channel('remote-control-status')
      .on('broadcast', { event: 'slideshow-status' }, (payload) => {
        console.log('Status update (status channel):', payload);
        if (payload.payload) {
          setSlideCount(payload.payload.total || 0);
          setCurrentSlide(payload.payload.current || 0);
          setIsPaused(payload.payload.paused || false);
          setCurrentImageName(payload.payload.currentImage || "");
          setIsConnected(true);
        }
      })
      .subscribe();

    const heartbeatChannel = supabase
      .channel('remote-control-heartbeat')
      .on('broadcast', { event: 'slideshow-status' }, (payload) => {
        console.log('Status update (heartbeat channel):', payload);
        if (payload.payload) {
          setSlideCount(payload.payload.total || 0);
          setCurrentSlide(payload.payload.current || 0);
          setIsPaused(payload.payload.paused || false);
          setCurrentImageName(payload.payload.currentImage || "");
          setIsConnected(true);
        }
      })
      .subscribe();

    setChannel(commandChannel);

    // Listen for image close notifications from main page
    const notificationChannel = supabase
      .channel('remote-control-notifications')
      .on('broadcast', { event: 'image-closed' }, () => {
        console.log('🖼️ Image closed on main page, clearing LIVE indicator');
        setLiveImage(null); // Clear live indicator
      })
      .subscribe();

    // Request initial status
    setTimeout(() => {
      console.log('📡 Requesting initial status');
      commandChannel.send({
        type: 'broadcast',
        event: 'request-status',
        payload: { timestamp: Date.now() }
      });
    }, 500);

    // Auto-request status every 10 seconds
    const statusInterval = setInterval(() => {
      commandChannel.send({
        type: 'broadcast',
        event: 'request-status',
        payload: { timestamp: Date.now() }
      });
    }, 10000);

    return () => {
      clearInterval(statusInterval);
      supabase.removeChannel(commandChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(heartbeatChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, []);

  // Fetch images for gallery with proper metadata including hidden flags
  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Use remote images API which includes hidden flags
        const response = await fetch('/api/remote-images');
        const data = await response.json();
        
        if (data.images) {
          const availableImages = data.images
            .filter((item: any) => {
              console.log('Filtering item:', item.name, 'isVideo:', item.isVideo, 'hidden:', item.hidden);
              
              // NEW LOGIC for image gallery: Show all regular images (original source images)
              // This is for users to select images for video generation
              // Exclude any item marked as hidden (merge placeholders) or already converted to videos
              if (item.hidden) return false; // Exclude hidden items
              if (item.isVideo) return false; // Exclude already-converted images
              
              return true; // Show regular images for selection
            })
            .map((item: any) => ({
              name: item.name,
              url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-images/${item.name}`
            }));

          setImages(availableImages);
          console.log('🖼️ Loaded images with hidden exclusions:', availableImages.length);
          console.log('📝 Available images:', availableImages.map((img: { name: string; url: string }) => img.name));
          console.log('📊 Full DB data:', data.images);
          console.log('🔍 Hidden items:', data.images.filter((i: any) => i.hidden));
          console.log('🎬 Video items:', data.images.filter((i: any) => i.isVideo));
          console.log('📊 Filtered from total:', data.images.length, '- Hidden:', data.images.filter((i: any) => i.hidden).length, '- Videos:', data.images.filter((i: any) => i.isVideo).length);
          
          // Log scenario explanation
          console.log('🎯 NEW Gallery Logic:');
          console.log('  - Always show regular images (non-video) for user selection');
          console.log('  - Exclude items that are already converted to videos (isVideo: true)');
          console.log('  - Merge video remains hidden (as usual)');
          console.log('  - CORE RULE: Image gallery = available source images for video generation');
          console.log('  - Current state:', availableImages.length, 'regular images available for selection');
        }
      } catch (error) {
        console.error('Failed to fetch images:', error);
        
        // Fallback to basic filtering without hidden data
        try {
          console.log('Trying fallback to public API...');
          const publicResponse = await fetch('/api/images');
          const publicData = await publicResponse.json();
          
          if (publicData.images) {
            const availableImages = publicData.images
              .filter((item: any) => !item.isVideo)
              .map((item: any) => ({
                name: item.name,
                url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-images/${item.name}`
              }));

            setImages(availableImages);
            console.log('🖼️ Using fallback images (no hidden data):', availableImages.length);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    };
    fetchImages();
  }, []);

  const sendCommand = useCallback((command: string, data?: any) => {
    if (!channel) {
      console.error('Channel not ready');
      return;
    }
    
    channel.send({
      type: 'broadcast',
      event: 'remote-command',
      payload: { command, data, timestamp: Date.now() }
    });
  }, [channel]);

  const handleImageClick = useCallback((image: {name: string; url: string}) => {
    console.log('🖱️ Remote clicking on image:', image.name);
    console.log('📡 Command details:', { name: image.name, url: image.url });
    
    // Send command to show image on main page
    sendCommand('show-image', { name: image.name, url: image.url });
    
    // Track which image is live
    setLiveImage(image.name);
    
    console.log('✅ Remote command sent to main page...');
  }, [sendCommand]);
    const handlePrevious = useCallback(() => sendCommand('previous'), [sendCommand]);
  const handleNext = useCallback(() => sendCommand('next'), [sendCommand]);
  const handlePlayPause = useCallback(() => sendCommand('toggle-pause'), [sendCommand]);
  const handleGoToSlide = useCallback((index: number) => sendCommand('goto', { index }), [sendCommand]);
  const handleFirst = useCallback(() => sendCommand('goto', { index: 0 }), [sendCommand]);
  const handleLast = useCallback(() => sendCommand('goto', { index: slideCount - 1 }), [sendCommand, slideCount]);
  const handleRestart = useCallback(() => sendCommand('restart'), [sendCommand]);
  const handleRefresh = useCallback(() => sendCommand('refresh'), [sendCommand]);
  const handleJumpTo = useCallback(() => {
    const slideNumber = parseInt(jumpToSlide);
    if (!isNaN(slideNumber) && slideNumber >= 1 && slideNumber <= slideCount) {
      handleGoToSlide(slideNumber - 1);
      setJumpToSlide("");
    }
  }, [jumpToSlide, slideCount, handleGoToSlide]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isConnected) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'Home':
          handleFirst();
          break;
        case 'End':
          handleLast();
          break;
        case 'r':
        case 'R':
          handleRestart();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isConnected, handlePrevious, handleNext, handlePlayPause, handleFirst, handleLast, handleRestart]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Head>
        <title>Remote Control - Slideshow</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      {/* Status Bar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`} />
              {isConnected ? (
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                </svg>
              ) : (
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Slideshow Control
          </h1>
        </div>

        {!isConnected && (
          <div className="mb-10 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 text-center backdrop-blur">
            <p className="text-sm font-medium text-amber-200">
              Establishing connection to slideshow...
            </p>
          </div>
        )}

        {/* Main Page Loading State */}
        {isConnected && isMainPageLoading && (
          <div className="mb-10 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 text-center backdrop-blur">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-blue-200">
                Loading main page dashboard...
              </p>
            </div>
            <p className="text-xs text-blue-300/70">
              Waiting for main page to finish initializing
            </p>
          </div>
        )}

        {/* No Content Available */}
        {isConnected && !isMainPageLoading && !isMainPageReady && (
          <div className="mb-10 rounded-xl border border-red-400/30 bg-gradient-to-r from-red-500/10 to-pink-500/10 p-4 text-center backdrop-blur">
            <p className="text-sm font-medium text-red-200">
              No content available on main page
            </p>
            <p className="text-xs text-red-300/70">
              Please upload images/videos in Admin panel
            </p>
          </div>
        )}

        {/* Playback Controls */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Playback Control</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePlayPause}
              disabled={!isConnected}
              className="col-span-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sky-500/50 hover:shadow-2xl"
            >
              {isPaused ? (
                <svg className="h-6 w-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Image Gallery - Only show when main page is ready with content */}
        {isConnected && !isMainPageLoading && isMainPageReady && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Image Gallery</h2>
              <div className="text-xs text-white/50">
                Showing {images.length} regular images (available for video generation)
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((image, index) => (
              <div
                key={image.name}
                onClick={() => handleImageClick(image)}
                className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer bg-white/5 border border-white/10 hover:border-sky-400/50 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* LIVE indicator */}
                {liveImage === image.name && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse shadow-lg">
                    LIVE
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs text-white truncate">
                      {image.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')}
                    </p>
                    <p className="text-xs text-sky-400">#{index + 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
