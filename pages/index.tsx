import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";

const DEFAULT_SLIDE_DURATION_SECONDS = 15;
const LANGUAGE_SWAP_INTERVAL_MS = 4_000;
const FADE_DURATION_MS = 500;
const AUTO_REFRESH_INTERVAL_MS = 60_000; // Check for new images every 60 seconds

type Language = "en" | "ko" | "id";
const LANGUAGE_SEQUENCE: Language[] = ["en", "ko", "id"];

type TransitionEffect = "fade" | "slide" | "zoom" | "none";
const DEFAULT_TRANSITION: TransitionEffect = "fade";

const translations = {
  loading: {
    en: "Loading images…",
    ko: "이미지를 불러오는 중…",
    id: "Memuat gambar...",
  },
  noSlides: {
    en: "No dashboards are being displayed yet.",
    ko: "현재 표시되는 대시보드가 없습니다.",
    id: "Belum ada dashboard yang ditampilkan.",
  },
  fetchError: {
    en: "Unable to load images. Please try refreshing the display.",
    ko: "이미지를 불러올 수 없습니다. 화면을 새로 고침해 보세요.",
    id: "Tidak dapat memuat gambar. Silakan segarkan tampilan.",
  },
  unknownError: {
    en: "An unexpected error occurred.",
    ko: "알 수 없는 오류가 발생했습니다.",
    id: "Terjadi kesalahan yang tidak terduga.",
  },
  badgeUpdating: {
    en: "Updating",
    ko: "업데이트 중",
    id: "Memperbarui",
  },
  badgeWarning: {
    en: "Warning",
    ko: "경고",
    id: "Peringatan",
  },
  badgeReady: {
    en: "Slideshow ready",
    ko: "슬라이드쇼 준비됨",
    id: "Slideshow siap",
  },
  loadingSubtext: {
    en: "Checking database storage for the latest dashboards. This screen refreshes automatically.",
    ko: "최신 대시보드를 확인하고 있습니다. 이 화면은 자동으로 새로 고쳐집니다.",
    id: "Memeriksa penyimpanan database untuk dashboard terbaru. Tampilan ini akan diperbarui otomatis.",
  },
  errorSubtext: {
    en: "Ensure the display is connected to the network. The system will retry shortly.",
    ko: "디스플레이가 네트워크에 연결되어 있는지 확인하세요. 잠시 후 다시 시도합니다.",
    id: "Pastikan layar terhubung ke jaringan. Sistem akan mencoba lagi sebentar lagi.",
  },
  noSlidesSubtext: {
    en: "Upload curated dashboards from the admin panel to start the rotation. This display updates automatically.",
    ko: "관리자 패널에서 대시보드를 업로드하면 슬라이드가 시작됩니다. 이 화면은 자동으로 업데이트됩니다.",
    id: "Unggah dashboard dari panel admin untuk memulai rotasi. Tampilan ini memperbarui otomatis.",
  },
  noSlidesFooter: {
    en: "Waiting for content",
    ko: "콘텐츠 대기 중",
    id: "Menunggu konten",
  },
} as const;

type AppError =
  | { kind: "fetch"; detail?: string }
  | { kind: "unknown"; detail?: string };

type Slide = {
  name: string;
  url: string;
  durationSeconds: number;
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000000",
    transition: "background-color 300ms ease",
  },
  imageWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    imageRendering: "high-quality" as any,
  },
  message: {
    fontSize: "1.35rem",
    textAlign: "center",
    maxWidth: "30rem",
    lineHeight: 1.7,
    color: "#e2e8f0",
    letterSpacing: "0.01em",
  },
  placeholderCard: {
    position: "relative",
    zIndex: 2,
    borderRadius: "32px",
    padding: "48px 56px",
    background: "rgba(15, 23, 42, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 24px 80px -32px rgba(15, 23, 42, 0.8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    maxWidth: "420px",
  },
  noSlidesMessage: {
    fontSize: "1.5rem",
    letterSpacing: "-0.01em",
    color: "rgba(248, 250, 252, 0.95)",
    textAlign: "center" as const,
  },
  accentBadge: {
    padding: "6px 14px",
    borderRadius: "9999px",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    color: "#bae6fd",
    fontSize: "0.78rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  subtleText: {
    color: "rgba(226, 232, 240, 0.75)",
    fontSize: "0.9rem",
    textAlign: "center",
    lineHeight: 1.6,
  },
  glow: {
    position: "absolute",
    inset: "auto",
    width: "52vw",
    height: "52vw",
    maxWidth: "720px",
    maxHeight: "720px",
    background: "radial-gradient(circle, rgba(56, 189, 248, 0.18), transparent 60%)",
    filter: "blur(60px)",
    transform: "translate(-20%, -10%)",
    zIndex: 1,
    pointerEvents: "none",
  },
  fadeText: {
    fontSize: "0.8rem",
    letterSpacing: "0.42em",
    textTransform: "uppercase",
    color: "rgba(148, 163, 184, 0.7)",
  },
  buttonGhost: {
    marginTop: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 18px",
    borderRadius: "9999px",
    backgroundColor: "rgba(241, 245, 249, 0.08)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    color: "rgba(248, 250, 252, 0.86)",
    fontSize: "0.82rem",
    fontWeight: 500,
    letterSpacing: "0.08em",
    cursor: "pointer",
  },
  controlsOverlay: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent)",
    padding: "40px 20px 20px",
    zIndex: 100,
    transition: "opacity 300ms ease, transform 300ms ease",
  },
  controlsContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    justifyContent: "center",
  },
  controlButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 200ms ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  slideInfo: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "0.95rem",
    fontWeight: 500,
  },
  thumbnailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "10px",
    maxHeight: "200px",
    overflowY: "auto",
    padding: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "8px",
  },
  thumbnail: {
    width: "100%",
    aspectRatio: "16/9",
    objectFit: "cover",
    borderRadius: "6px",
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "all 200ms ease",
  },
  thumbnailActive: {
    border: "2px solid #60a5fa",
    boxShadow: "0 0 12px rgba(96, 165, 250, 0.5)",
  },
  slideNumber: {
    position: "absolute",
    top: "4px",
    left: "4px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#ffffff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
} as const;

const getErrorMessage = (appError: AppError, language: Language) => {
  const base =
    appError.kind === "fetch"
      ? translations.fetchError[language]
      : translations.unknownError[language];
  return appError.detail ? `${base} (${appError.detail})` : base;
};

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [fadeIn, setFadeIn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffect>(DEFAULT_TRANSITION);
  const slidesRef = useRef<Slide[]>([]);
  const indexRef = useRef(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Fetch slides from API (reusable function)
  const fetchSlides = useCallback(async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      }
      
      // Fetch image list with cache busting
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/api/images${cacheBuster}`, { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load image list: ${response.statusText}`);
      }
      const payload: { images: string[]; durations?: Record<string, number | null>; captions?: Record<string, string | null> } = await response.json();

      // Fetch durations
      let imageDurations: Record<string, number> = {};
      if (payload.durations) {
        Object.entries(payload.durations).forEach(([key, value]) => {
          if (typeof value === "number" && !Number.isNaN(value)) {
            imageDurations[key] = value;
          } else if (typeof value === "string") {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
              imageDurations[key] = parsed;
            }
          }
        });
      } else {
        const configResponse = await fetch("/api/config", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (configResponse.ok) {
          const configData = await configResponse.json();
          Object.entries(configData || {}).forEach(([key, value]) => {
            if (typeof value === "number" && !Number.isNaN(value)) {
              imageDurations[key] = value;
            } else if (typeof value === "string") {
              const parsed = Number(value);
              if (!Number.isNaN(parsed)) {
                imageDurations[key] = parsed;
              }
            }
          });
        }
      }

      console.log("[Slideshow] Duration data received:", imageDurations);

      const fetchedSlides = payload.images.map((filename) => {
        const durationMs = imageDurations[filename];
        const durationSeconds =
          typeof durationMs === "number" && durationMs > 0
            ? Math.max(1, Math.round(durationMs / 1000))
            : DEFAULT_SLIDE_DURATION_SECONDS;
        
        if (durationMs !== undefined) {
          console.log(`[Slideshow] ${filename}: ${durationMs}ms -> ${durationSeconds}s`);
        }
        
        return {
          name: filename,
          url: `/api/image/${encodeURIComponent(filename)}`,
          durationSeconds,
        };
      });

      // Check if slides have changed
      const previousSlides = slidesRef.current;
      const slidesChanged = 
        previousSlides.length !== fetchedSlides.length ||
        previousSlides.some((slide, index) => {
          const next = fetchedSlides[index];
          if (!next) return true;
          return (
            slide.name !== next.name ||
            slide.durationSeconds !== next.durationSeconds ||
            slide.url !== next.url
          );
        });

      if (slidesChanged) {
        console.log(`${isAutoRefresh ? '🔄 Auto-refresh:' : '✅'} Fetched ${fetchedSlides.length} slides${slidesChanged && isAutoRefresh ? ' (UPDATED!)' : ''}`, fetchedSlides.map(s => s.name));
        
        // Preload first image only on initial load
        if (!isAutoRefresh && fetchedSlides.length > 0) {
          const img = new Image();
          img.src = fetchedSlides[0].url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        
        setSlides(fetchedSlides);
        slidesRef.current = fetchedSlides;
        
        // Only reset index if new slides list is different
        if (isAutoRefresh) {
          // If current index is out of bounds, reset to 0
          if (indexRef.current >= fetchedSlides.length) {
            setCurrentIndex(0);
            indexRef.current = 0;
          }
        } else {
          setCurrentIndex(0);
          indexRef.current = 0;
        }
        
        setError(null);
      } else if (isAutoRefresh) {
        console.log(`🔄 Auto-refresh: No changes detected (${fetchedSlides.length} slides)`);
      }
      
      return fetchedSlides;
    } catch (err) {
      console.error("❌ Error fetching slides:", err);
      const detail = err instanceof Error ? err.message : undefined;
      if (!isAutoRefresh) {
        setError({ kind: "fetch", detail });
      }
      return null;
    } finally {
      if (!isAutoRefresh) {
        setLoading(false);
      }
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchSlides(false);
    
    // Load transition effect from settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.transitionEffect) {
          setTransitionEffect(data.transitionEffect);
        }
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, [fetchSlides]);

  // Auto-refresh: Check for new images periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 Checking for new images...');
      fetchSlides(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchSlides]);

  useEffect(() => {
    const channel = supabase
      .channel("image-metadata-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "image_durations" },
        () => {
          console.log("📡 Metadata change detected, refreshing slides");
          fetchSlides(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSlides]);

  // Listen for force refresh broadcast from admin panel
  useEffect(() => {
    const controlChannel = supabase
      .channel('slideshow-control')
      .on('broadcast', { event: 'force-refresh' }, (payload) => {
        console.log('⚡ Force refresh signal received from admin panel:', payload);
        fetchSlides(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(controlChannel);
    };
  }, [fetchSlides]);

  // Auto-rotate slides with smooth fade
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      console.log(`⏸️ Not rotating: ${slides.length} slide(s), paused: ${isPaused}`);
      return;
    }

    const currentSlide = slides[currentIndex];
    if (!currentSlide) return;

    console.log(`⏱️ Timer set for ${currentSlide.durationSeconds}s (slide ${currentIndex + 1}/${slides.length}: ${currentSlide.name})`);

    const timer = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      const nextSlide = slides[nextIndex];
      
      console.log(`➡️ Transitioning to slide ${nextIndex + 1}/${slides.length}: ${nextSlide?.name}`);
      
      // Preload next image before transition
      if (nextSlide) {
        const img = new Image();
        img.src = nextSlide.url;
        img.onload = () => {
          console.log(`🔄 Preloaded: ${nextSlide.name}`);
          // Fade out current
          setFadeIn(false);
          
          // After fade out, switch image and fade in
          setTimeout(() => {
            setCurrentIndex(nextIndex);
            setFadeIn(true);
          }, FADE_DURATION_MS);
        };
        img.onerror = () => {
          // If preload fails, just switch anyway
          console.error(`❌ Failed to preload: ${nextSlide.name}`);
          setFadeIn(false);
          setTimeout(() => {
            setCurrentIndex(nextIndex);
            setFadeIn(true);
          }, FADE_DURATION_MS);
        };
      }
    }, currentSlide.durationSeconds * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [slides, currentIndex, isPaused]);

  // Rotate language
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LANGUAGE_SEQUENCE.length;
      setLanguage(LANGUAGE_SEQUENCE[index]);
    }, LANGUAGE_SWAP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex(index);
        setFadeIn(true);
      }, FADE_DURATION_MS / 2);
    }
  }, [slides.length]);

  // Save transition effect to settings
  const saveTransitionEffect = useCallback(async (effect: TransitionEffect) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionEffect: effect }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save transition effect:', errorText);
        // Still update local state even if save fails
        setTransitionEffect(effect);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Transition effect saved:', data);
      setTransitionEffect(effect);
    } catch (error) {
      console.error('Failed to save transition effect:', error);
      // Still update local state even if save fails
      setTransitionEffect(effect);
    }
  }, []);

  const goToNextSlide = useCallback(() => {
    const nextIndex = (currentIndex + 1) % slides.length;
    goToSlide(nextIndex);
  }, [currentIndex, slides.length, goToSlide]);

  const goToPreviousSlide = useCallback(() => {
    const prevIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    goToSlide(prevIndex);
  }, [currentIndex, slides.length, goToSlide]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);
    setSlides(newSlides);
    slidesRef.current = newSlides;
    
    // Adjust current index if needed
    if (currentIndex === fromIndex) {
      setCurrentIndex(toIndex);
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [slides, currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle controls with 'c' or 'Escape'
      if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
        setShowControls(prev => !prev);
        return;
      }

      // Space - toggle pause
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        console.log(`⏯️ Slideshow ${!isPaused ? 'paused' : 'resumed'}`);
        return;
      }

      // Arrow keys - navigate
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextSlide();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPreviousSlide();
        return;
      }

      // Home/End - first/last slide
      if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(0);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        goToSlide(slides.length - 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [slides.length, isPaused, goToNextSlide, goToPreviousSlide, goToSlide]);

  // Auto-hide controls after 5 seconds
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  // Mouse movement shows controls
  useEffect(() => {
    let moveTimeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(moveTimeout);
    };
  }, []);

  // Listen for remote control commands
  useEffect(() => {
    const remoteChannel = supabase
      .channel('remote-control')
      .on('broadcast', { event: 'remote-command' }, (payload) => {
        console.log('📱 Remote command received:', payload);
        const { command, data } = payload.payload || {};
        
        switch (command) {
          case 'previous':
            goToPreviousSlide();
            break;
          case 'next':
            goToNextSlide();
            break;
          case 'toggle-pause':
            setIsPaused(prev => !prev);
            break;
          case 'goto':
            if (data?.index !== undefined) {
              goToSlide(data.index);
            }
            break;
          case 'change-transition':
            if (data?.effect) {
              setTransitionEffect(data.effect);
              console.log('🎨 Transition effect changed to:', data.effect);
            }
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
            paused: isPaused,
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(remoteChannel);
    };
  }, [slides.length, currentIndex, isPaused, goToNextSlide, goToPreviousSlide, goToSlide]);

  // Broadcast status updates
  useEffect(() => {
    const remoteChannel = supabase.channel('remote-control');
    remoteChannel.send({
      type: 'broadcast',
      event: 'slideshow-status',
      payload: {
        total: slides.length,
        current: currentIndex,
        paused: isPaused,
      }
    });
  }, [slides.length, currentIndex, isPaused]);

  // Keep screen awake and auto-reload for LG TV - every 30 minutes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let wakeLock: any = null;
    let activityInterval: NodeJS.Timeout | null = null;
    let reloadInterval: NodeJS.Timeout | null = null;

    // Detect webOS browser
    const isWebOS = /webOS|hpwOS/.test(navigator.userAgent);
    
    if (isWebOS) {
      console.log('📺 webOS browser detected - activating webOS-specific keep-awake');
    }

    // 1. Wake Lock API (modern browsers and some Smart TVs)
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('🔒 Screen Wake Lock activated');
          
          wakeLock.addEventListener('release', () => {
            console.log('🔓 Wake Lock released, re-requesting...');
            requestWakeLock();
          });
        }
      } catch (err) {
        console.log('⚠️ Wake Lock not supported, using fallback methods');
      }
    };

    // 2. webOS-specific keep-awake trigger
    const webOSKeepAwake = () => {
      try {
        // Try webOS specific API if available
        if ((window as any).webOS && (window as any).webOS.service) {
          const bridge = (window as any).webOS.service.request('luna://com.palm.powermanager/', {
            method: 'activityStart',
            parameters: {
              id: 'slideshow-app',
              reason: 'Display slideshow content'
            },
            onSuccess: () => {
              console.log('✅ webOS activity started');
            },
            onFailure: () => {
              console.log('⚠️ webOS activity start failed');
            }
          });
        } else if ((window as any).webOS && (window as any).webOS.platformBack) {
          // Alternative: use webOS keyboard API
          console.log('📺 webOS detected but using alternative keep-awake method');
        }
      } catch (e) {
        // Silently ignore
      }
    };

    // 3. Activity simulation for LG TV (includes webOS triggers)
    const simulateActivity = () => {
      // Multiple types of events to keep LG TV awake
      const events = [
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight,
        }),
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          view: window,
          touches: [] as any,
        }),
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Shift',
        })
      ];
      
      events.forEach(event => {
        try {
          document.dispatchEvent(event);
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Additional webOS activity trigger
      if (isWebOS) {
        webOSKeepAwake();
      }
      
      console.log('🖱️ Activity simulation triggered to keep LG TV awake');
    };

    // 4. Prevent visibility change sleep
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (isWebOS) {
          webOSKeepAwake();
        }
      }
    };

    // 5. Force full screen mode (helps prevent LG TV timeout)
    const requestFullscreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    };

    // Initialize all methods
    requestWakeLock();
    
    // Try to enter fullscreen (helps with LG TV)
    setTimeout(requestFullscreen, 2000);
    
    // webOS keep-awake on startup
    if (isWebOS) {
      setTimeout(webOSKeepAwake, 1000);
    }
    
    // Activity simulation every 25 minutes
    activityInterval = setInterval(() => {
      simulateActivity();
      console.log('⏰ 25-minute activity trigger');
    }, 25 * 60 * 1000); // 25 minutes
    
    // Auto-reload every 25 minutes to keep TV awake
    reloadInterval = setInterval(() => {
      console.log('🔄 Auto-reloading page to keep LG TV awake (25 min)');
      window.location.reload();
    }, 25 * 60 * 1000); // 25 minutes
    
    // Re-request wake lock on visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
      if (activityInterval) {
        clearInterval(activityInterval);
      }
      if (reloadInterval) {
        clearInterval(reloadInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading || error) {
    return (
      <main style={styles.container}>
        <Head>
          <title>Slideshow</title>
        </Head>
        <div style={styles.glow} />
        <div style={styles.placeholderCard}>
          <span style={styles.accentBadge}>
            {loading ? translations.badgeUpdating[language] : translations.badgeWarning[language]}
          </span>
          <h2 style={styles.noSlidesMessage}>
            {loading ? translations.loading[language] : getErrorMessage(error!, language)}
          </h2>
          <p style={styles.subtleText}>
            {loading ? translations.loadingSubtext[language] : translations.errorSubtext[language]}
          </p>
        </div>
      </main>
    );
  }

  // No slides
  if (slides.length === 0) {
    return (
      <main style={styles.container}>
        <Head>
          <title>Slideshow</title>
        </Head>
        <div style={styles.glow} />
        <div style={styles.placeholderCard}>
          <span style={styles.accentBadge}>{translations.badgeReady[language]}</span>
          <h2 style={styles.noSlidesMessage}>{translations.noSlides[language]}</h2>
          <p style={styles.subtleText}>{translations.noSlidesSubtext[language]}</p>
          <span style={styles.fadeText}>{translations.noSlidesFooter[language]}</span>
        </div>
      </main>
    );
  }

  // Display current slide
  const currentSlide = slides[currentIndex];

  // Get transition styles based on selected effect
  const getTransitionStyle = (): CSSProperties => {
    const baseStyle: CSSProperties = {
      ...styles.imageWrapper,
      transition: `all ${FADE_DURATION_MS}ms ease-in-out`,
    };

    switch (transitionEffect) {
      case "fade":
        return {
          ...baseStyle,
          opacity: fadeIn ? 1 : 0,
        };
      case "slide":
        return {
          ...baseStyle,
          opacity: 1,
          transform: fadeIn ? "translateX(0)" : "translateX(100%)",
        };
      case "zoom":
        return {
          ...baseStyle,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "scale(1)" : "scale(0.8)",
        };
      case "none":
        return {
          ...baseStyle,
          opacity: 1,
          transition: "none",
        };
      default:
        return {
          ...baseStyle,
          opacity: fadeIn ? 1 : 0,
        };
    }
  };

  return (
    <main style={styles.container}>
      <Head>
        <title>Slideshow</title>
      </Head>
      <div 
        style={getTransitionStyle()}
      >
        {currentSlide && (
          <img
            key={currentSlide.url}
            src={currentSlide.url}
            alt={currentSlide.name}
            style={styles.image}
            onLoad={() => console.log(`🖼️ Displayed: ${currentSlide.name}`)}
            onError={(e) => console.error(`❌ Failed to display: ${currentSlide.name}`, e)}
          />
        )}
      </div>

      {/* Controls Overlay */}
      <div 
        style={{
          ...styles.controlsOverlay,
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div style={styles.controlsContainer}>
          {/* Slide info and playback controls */}
          <div style={styles.controlsRow}>
            <button
              style={styles.controlButton}
              onClick={goToPreviousSlide}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              ⏮️ Previous
            </button>

            <button
              style={{
                ...styles.controlButton,
                backgroundColor: isPaused ? "rgba(96, 165, 250, 0.3)" : "rgba(255, 255, 255, 0.1)",
              }}
              onClick={() => setIsPaused(!isPaused)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isPaused ? "rgba(96, 165, 250, 0.4)" : "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isPaused ? "rgba(96, 165, 250, 0.3)" : "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isPaused ? '▶️ Play' : '⏸️ Pause'}
            </button>

            <button
              style={styles.controlButton}
              onClick={goToNextSlide}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Next ⏭️
            </button>
          </div>

          {/* Transition selector */}
          <div style={styles.controlsRow}>
            {(['fade', 'slide', 'zoom', 'none'] as TransitionEffect[]).map((effect) => (
              <button
                key={effect}
                onClick={() => saveTransitionEffect(effect)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: transitionEffect === effect 
                    ? "rgba(96, 165, 250, 0.5)" 
                    : "rgba(255, 255, 255, 0.1)",
                  border: transitionEffect === effect
                    ? "1px solid rgba(96, 165, 250, 0.8)"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: '0.9rem',
                  fontWeight: transitionEffect === effect ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = transitionEffect === effect
                    ? "rgba(96, 165, 250, 0.6)"
                    : "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = transitionEffect === effect
                    ? "rgba(96, 165, 250, 0.5)"
                    : "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {effect.charAt(0).toUpperCase() + effect.slice(1)}
              </button>
            ))}
          </div>

          {/* Thumbnail grid */}
          <div style={styles.thumbnailGrid}>
            {slides.map((slide, index) => (
              <div
                key={slide.name}
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => goToSlide(index)}
              >
                <span style={styles.slideNumber}>{index + 1}</span>
                <img
                  src={slide.url}
                  alt={slide.name}
                  style={{
                    ...styles.thumbnail,
                    ...(index === currentIndex ? styles.thumbnailActive : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (index !== currentIndex) {
                      e.currentTarget.style.border = "2px solid rgba(255, 255, 255, 0.5)";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentIndex) {
                      e.currentTarget.style.border = "2px solid transparent";
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
            Press <kbd style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>C</kbd> or <kbd style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>ESC</kbd> to toggle controls • <kbd style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>Space</kbd> to pause • <kbd style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>←</kbd><kbd style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>→</kbd> to navigate
          </div>
        </div>
      </div>
    </main>
  );
}
