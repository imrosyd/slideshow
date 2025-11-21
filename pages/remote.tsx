// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase-mock";
import { useRouter } from "next/router";
import { getBrowserId } from "../lib/browser-utils";
import useWebSocket from "../hooks/useWebSocket";

export default function RemoteControl() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false); // Connected to websocket server
  const [targetClientId, setTargetClientId] = useState<string | null>(null); // The ID of the slideshow to control
  const [paired, setPaired] = useState(false); // Whether we are paired with a specific client
  const [inputClientId, setInputClientId] = useState(""); // For the input field
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentImageName, setCurrentImageName] = useState<string>("");
  const [jumpToSlide, setJumpToSlide] = useState<string>("");
  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(5000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [images, setImages] = useState<Array<{name: string; url: string}>>([]);
  const [liveImage, setLiveImage] = useState<string | null>(null); // Track which image is showing on main page
  const [isMainPageLoading, setIsMainPageLoading] = useState(true); // Track main page loading state
  const [isMainPageReady, setIsMainPageReady] = useState(false); // Track when main page has content

  // WebSocket connection for this remote control instance
  const { clientId: remoteClientId, sendMessage } = useWebSocket(useCallback((message: any) => {
    if (message.type === 'status-update' && message.payload) {
      const payload = message.payload;
      setSlideCount(payload.total || 0);
      setCurrentSlide(payload.current || 0);
      setIsPaused(payload.paused || false);
      setCurrentImageName(payload.currentImage || "");
      setIsConnected(true); // WebSocket connection is active

      const hasContent = payload.total > 0;
      setIsMainPageLoading(false);
      setIsMainPageReady(hasContent);
      console.log('Remote received status update:', payload);
    } else {
      console.log('Remote received other WebSocket message:', message);
    }
  }, []));

  // Fetch images for gallery (use the public `api/gallery-images` endpoint
  // which returns image URLs suitable for the gallery view).
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const cacheBuster = `?_t=${Date.now()}`;
        const response = await fetch(`/api/gallery-images${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) {
          console.warn('Failed to fetch gallery images:', response.statusText);
          setImages([]);
          return;
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.images)) {
          console.warn('Gallery images returned invalid payload');
          setImages([]);
          return;
        }

        // The API already returns { name, url } entries for images
        setImages(data.images.map((i: any) => ({ name: i.name, url: i.url })));
        console.log('🖼️ Loaded gallery images:', data.images.length);
      } catch (err) {
        console.error('Error fetching gallery images:', err);
        setImages([]);
      }
    };

    fetchImages();
  }, []);

  const sendCommand = useCallback(async (command: string, data?: any) => {
    if (!targetClientId) {
      console.error('No target client ID set.');
      return;
    }

    try {
      const response = await fetch('/api/remote-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: targetClientId,
          command: { type: command, data: { ...data, remoteClientId: remoteClientId } }, // Include remote's own clientId
        }),
      });

      if (!response.ok) {
        console.error('Failed to send command:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  }, [targetClientId, remoteClientId]);

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
  const handleCloseOverlay = useCallback(() => sendCommand('close-overlay'), [sendCommand]);
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
      if (!paired) return;
      
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
  }, [paired, handlePrevious, handleNext, handlePlayPause, handleFirst, handleLast, handleRestart]);

  const handlePair = () => {
    if (inputClientId) {
      setTargetClientId(inputClientId);
      setPaired(true);
      // Immediately request status from the newly paired client
      sendCommand('request-status', { remoteClientId });
    }
  };

  // Authenticated - show remote control
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
              <div className={`h-3 w-3 rounded-full ${paired ? 'bg-emerald-400' : 'bg-red-500'} ${paired ? 'animate-pulse' : ''}`} />
              {paired ? (
                <>
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Paired with: {targetClientId}</span>
                </>
              ) : (
                <>
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-medium">Not paired</span>
                </>
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

        {/* Client ID Input */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Target Device</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={inputClientId}
              onChange={(e) => setInputClientId(e.target.value.toUpperCase())}
              className="flex-grow rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-40"
              disabled={paired}
              maxLength={4}
            />
            <button
              onClick={handlePair}
              disabled={!inputClientId || paired}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sky-500/50 hover:shadow-2xl"
            >
              {paired ? 'Paired' : 'Pair Device'}
            </button>
             {paired && (
              <button
                onClick={() => {
                  setPaired(false);
                  setTargetClientId(null);
                  setInputClientId("");
                }}
                className="rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 active:scale-95 hover:shadow-red-500/50 hover:shadow-2xl"
              >
                Unpair
              </button>
            )}
          </div>
        </div>

        {!paired && (
          <div className="mb-10 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 text-center backdrop-blur">
            <p className="text-sm font-medium text-amber-200">
              Enter a Client ID to pair with a slideshow display.
            </p>
          </div>
        )}

        {/* Main Page Loading State */}
        {paired && isMainPageLoading && (
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
        {paired && !isMainPageLoading && !isMainPageReady && (
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
        {paired && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Playback Control</h2>
            <div className="grid gap-3">
              {/* Close Overlay Button - Only show when an image is live */}
              {liveImage ? (
                <button
                  onClick={handleCloseOverlay}
                  disabled={!paired}
                  className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-red-500/50 hover:shadow-2xl"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Close Image Overlay</span>
                  </div>
                </button>
              ) : (
                <div className="text-center text-sm text-white/50 italic">
                  Select a dashboard to display
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Gallery - Only show when main page is ready with content */}
        {paired && !isMainPageLoading && isMainPageReady && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Image Gallery</h2>
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
