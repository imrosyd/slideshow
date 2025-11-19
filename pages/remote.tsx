// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase-mock";
import { useRouter } from "next/router";
import { getBrowserId } from "../lib/browser-utils";

export default function RemoteControl() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
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

  // Authentication check
  useEffect(() => {
    let mounted = true;
    let heartbeatInterval: NodeJS.Timeout;
    let sessionCheckInterval: NodeJS.Timeout;

    const checkAuthAndSession = async () => {
      try {
        // Try to get admin token from sessionStorage for local auth
        // Use the same key as other pages (`admin-auth-token`)
        const adminToken = sessionStorage.getItem("admin-auth-token");
        let accessToken: string | null = null;

        if (adminToken) {
          // Token exists, use it
          accessToken = adminToken;
          console.log("[Remote] Using local admin-auth-token");

          // Mirror to legacy key `supabase-token` for compatibility with
          // session heartbeat/check logic that may expect that key.
          if (!sessionStorage.getItem('supabase-token')) {
            sessionStorage.setItem('supabase-token', adminToken);
          }
        }
        
        if (!accessToken) {
          // Not logged in — do not force a redirect. Allow the remote page
          // to render and receive status updates (read-only) while unauthenticated.
          console.log("[Remote] No valid token — continuing in read-only mode");
          if (mounted) {
            setIsCheckingAuth(false);
            setIsAuthenticated(false);
          }
        } else {
          // Success - authenticated with local token
          if (mounted) {
            console.log('[Remote] Authentication successful');
            setIsAuthenticated(true);
            setIsCheckingAuth(false);
            setSessionError(null);
          }
        }

        // For local auth, we just need to verify the token exists
        // No complex session management needed
        
        // Success - authenticated with local token
        if (mounted) {
          console.log("[Remote] Authentication successful");
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          setSessionError(null);
        }

        // Setup heartbeat to keep session alive (every 60 seconds)
        heartbeatInterval = setInterval(async () => {
          try {
            const currentToken = sessionStorage.getItem("supabase-token");
            if (currentToken) {
              await fetch("/api/session/heartbeat", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${currentToken}`,
                },
              });
            }
          } catch (err) {
            console.error("[Remote] Heartbeat failed:", err);
          }
        }, 60000);

        // Setup periodic session check to detect concurrent logins (every 15 seconds)
        sessionCheckInterval = setInterval(async () => {
          try {
            const currentToken = sessionStorage.getItem("supabase-token");
            const currentSessionId = sessionStorage.getItem("remote-session-id");
            if (!currentToken || !currentSessionId) return;
            
            const currentBrowserId = getBrowserId();

            const checkResponse = await fetch("/api/session/check", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentToken}`,
              },
              body: JSON.stringify({ page: "remote", sessionId: currentSessionId, browserId: currentBrowserId }),
            });

            if (!checkResponse.ok) {
              const error = await checkResponse.json();
              if (error.error === "concurrent_session") {
                // Another user is logged in - logout this session
                console.warn("[Remote] Concurrent session detected, logging out");
                sessionStorage.removeItem("supabase-token");
                sessionStorage.removeItem("remote-session-id");
                setSessionError("Another user is logged in. You have been logged out.");
                setIsAuthenticated(false);
              }
            }
          } catch (err) {
            console.error("[Remote] Session check failed:", err);
          }
        }, 15000);

      } catch (error) {
        console.error("[Remote] Auth check error:", error);
        if (mounted) {
          sessionStorage.removeItem("supabase-token");
          sessionStorage.removeItem("remote-session-id");
          router.push("/login?redirect=remote");
        }
      }
    };

    checkAuthAndSession();

    return () => {
      mounted = false;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [router]);

  // Remote control logic (runs on mount). Subscribing early allows the
  // remote page to show connection status even before the user authenticates.
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

    // Also listen for the legacy/initial-status channel used by the main page
    // (it sends an initial one-off status on `remote-control-status-init`).
    const initStatusChannel = supabase
      .channel('remote-control-status-init')
      .on('broadcast', { event: 'slideshow-status' }, (payload) => {
        console.log('Status update (init status channel):', payload);
        if (payload.payload) {
          setSlideCount(payload.payload.total || 0);
          setCurrentSlide(payload.payload.current || 0);
          setIsPaused(payload.payload.paused || false);
          setCurrentImageName(payload.payload.currentImage || "");
          // mark main page loading/ready state when initial status arrives
          const hasContent = payload.payload.total > 0;
          setIsMainPageLoading(false);
          setIsMainPageReady(hasContent);
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

    // no-op: debug logging removed

    // Listen for image close notifications from main page
    const notificationChannel = supabase
      .channel('remote-control-notifications')
      .on('broadcast', { event: 'image-closed' }, () => {
        console.log('🖼️ Image closed on main page, clearing LIVE indicator');
        setLiveImage(null); // Clear live indicator
      })
      .subscribe();
    // attach simple logging subscriptions
    commandChannel.subscribe && commandChannel.subscribe();
    statusChannel.subscribe && statusChannel.subscribe();
    heartbeatChannel.subscribe && heartbeatChannel.subscribe();
    notificationChannel.subscribe && notificationChannel.subscribe();

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
      supabase.removeChannel(initStatusChannel);
      supabase.removeChannel(heartbeatChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, []);

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

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <>
        <Head>
          <title>Remote Control - Loading</title>
        </Head>
        <main className="min-h-screen w-full bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-lg">
            <div className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl"></div>
            <div className="absolute -bottom-36 -left-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"></div>
            <div className="relative z-10 px-8 py-10 flex flex-col gap-6 text-white">
              <div className="flex flex-col gap-2 text-center">
                <span className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Remote Control
                </span>
                <h1 className="text-3xl font-semibold tracking-tight">Authentication</h1>
                <p className="text-sm text-white/60">
                  Checking your credentials...
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-sky-500/30 border-t-sky-500"></div>
                <p className="text-sm text-white/70">Please wait</p>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Show error if concurrent session detected
  if (sessionError) {
    return (
      <>
        <Head>
          <title>Remote Control - Session Error</title>
        </Head>
        <main className="min-h-screen w-full bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-400/20 bg-white/5 shadow-glass backdrop-blur-lg">
            <div className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-rose-500/30 blur-3xl"></div>
            <div className="absolute -bottom-36 -left-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl"></div>
            <div className="relative z-10 px-8 py-10 flex flex-col gap-6 text-white">
              <div className="flex flex-col gap-2 text-center">
                <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20 text-5xl">
                  ⛔
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">Session Already Active</h1>
                <p className="text-sm text-white/70 leading-relaxed">
                  {sessionError}
                </p>
              </div>
              <button
                onClick={() => {
                  supabase.auth.signOut();
                  router.push('/admin');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-400 to-red-500 px-5 py-3 text-base font-semibold text-white transition hover:shadow-lg hover:shadow-rose-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-rose-400 active:scale-95"
              >
                Back to Login
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

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

        {/* Debug panel removed */}

        {/* Playback Controls */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Playback Control</h2>
          <div className="grid gap-3">
            {/* Close Overlay Button - Only show when an image is live */}
            {liveImage ? (
              <button
                onClick={handleCloseOverlay}
                disabled={!isConnected}
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

        {/* Image Gallery - Only show when main page is ready with content */}
        {isConnected && !isMainPageLoading && isMainPageReady && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Image Gallery</h2>
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
