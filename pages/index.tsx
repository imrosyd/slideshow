import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { cacheVideo, getCachedVideo, getCacheStats } from "../lib/videoCache";

const DEFAULT_SLIDE_DURATION_SECONDS = 20;
const LANGUAGE_SWAP_INTERVAL_MS = 4_000;
const FADE_DURATION_MS = 0; // Instant transition, no fade
const AUTO_REFRESH_INTERVAL_MS = 60_000; // Check for new images every 60 seconds

type Language = "en" | "ko" | "id";
const LANGUAGE_SEQUENCE: Language[] = ["en", "ko", "id"];

// Precompute Supabase origin for resource hints
const SUPABASE_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
})();

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
  isVideo?: boolean;
  videoUrl?: string;
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
  videoPlayIcon: {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "32px",
    height: "32px",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" as const,
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
  countdownBadge: {
    position: "absolute",
    top: "4px",
    right: "4px",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    color: "#ffffff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
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

  // Resource hints to reduce connection latency to Supabase (storage, realtime)
  // Safe for webOS; ignored if duplicate
  // Placed here to ensure it’s included on TV display page
  const ResourceHints = (
    <Head>
      {SUPABASE_ORIGIN && (
        <>
          <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="" />
          <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
        </>
      )}
    </Head>
  );

  // Preload next video aggressively using hidden video element
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    
    const nextIdx = (currentIndex + 1) % slides.length;
    const next = slides[nextIdx];
    if (!next || !next.videoUrl) return;

    const preloadId = "slideshow-preload-video";
    
    // Remove previous preload video if exists
    const existing = document.getElementById(preloadId);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    // Reset ready state
    setNextVideoReady(false);

    // Create hidden video element to preload
    const video = document.createElement("video");
    video.id = preloadId;
    video.src = next.videoUrl;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.style.display = "none";
    video.style.position = "absolute";
    video.style.visibility = "hidden";
    
    // Set ready flag when video can play
    video.addEventListener('canplaythrough', () => {
      console.log(`✅ Next video ready: ${next.videoUrl?.split('/').pop()}`);
      setNextVideoReady(true);
    }, { once: true });

    video.addEventListener('error', (e) => {
      console.error(`❌ Failed to preload next video: ${next.videoUrl?.split('/').pop()}`, e);
      setNextVideoReady(false);
    }, { once: true });

    document.body.appendChild(video);
    video.load();

    console.log(`🔄 Preloading next video: ${next.videoUrl.split('/').pop()}`);

    return () => {
      // Cleanup on unmount or when next video changes
      const elem = document.getElementById(preloadId);
      if (elem && elem.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    };
  }, [currentIndex, slides]);
  const [language, setLanguage] = useState<Language>("en");
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [slideCountdowns, setSlideCountdowns] = useState<number[]>([]);
  const [nextVideoReady, setNextVideoReady] = useState(false);
  const [cachedVideos, setCachedVideos] = useState<Set<string>>(new Set());
  const slidesRef = useRef<Slide[]>([]);
  const indexRef = useRef(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenRequestedRef = useRef(false);
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const lastKeepAwakeTimeRef = useRef<number>(0);
  const slideStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Initialize video cache on mount
  useEffect(() => {
    getCacheStats()
      .then(stats => {
        console.log(`📊 Video Cache initialized: ${stats.videoCount} videos, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
        const urls = new Set(stats.videos.map(v => v.url));
        setCachedVideos(urls);
      })
      .catch(err => console.error('Failed to initialize cache:', err));
  }, []);

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
      const payload: { images: Array<{ name: string; isVideo?: boolean; videoUrl?: string }>; durations?: Record<string, number | null>; captions?: Record<string, string | null> } = await response.json();

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

      const fetchedSlides = payload.images
        .filter((imageItem) => {
          // Only include items that have video generated
          const isVideo = typeof imageItem === 'string' ? false : (imageItem.isVideo || false);
          return isVideo;
        })
        .map((imageItem) => {
          const filename = typeof imageItem === 'string' ? imageItem : imageItem.name;
          const isVideo = typeof imageItem === 'string' ? false : (imageItem.isVideo || false);
          const videoUrl = typeof imageItem === 'string' ? undefined : imageItem.videoUrl;
          
          const durationMs = imageDurations[filename];
          const durationSeconds =
            typeof durationMs === "number" && durationMs > 0
              ? Math.max(1, Math.round(durationMs / 1000))
              : DEFAULT_SLIDE_DURATION_SECONDS;
          
          console.log(`[Slideshow] Video: ${filename} -> ${durationSeconds}s, URL: ${videoUrl || 'none'}`);
          
          return {
            name: filename,
            url: videoUrl || `/api/image/${encodeURIComponent(filename)}`,
            durationSeconds,
            isVideo,
            videoUrl,
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
            slide.url !== next.url ||
            slide.isVideo !== next.isVideo ||
            slide.videoUrl !== next.videoUrl
          );
        });

      if (slidesChanged) {
        console.log(`${isAutoRefresh ? '🔄 Auto-refresh:' : '✅'} Fetched ${fetchedSlides.length} slides${slidesChanged && isAutoRefresh ? ' (UPDATED!)' : ''}`, fetchedSlides.map(s => s.name));
        
        // Validation: Log all slides with details
        console.log(`📋 SLIDES VALIDATION (Total: ${fetchedSlides.length}):`);
        fetchedSlides.forEach((slide, idx) => {
          console.log(`  [${idx + 1}/${fetchedSlides.length}] ${slide.name}`);
          console.log(`     - isVideo: ${slide.isVideo}`);
          console.log(`     - duration: ${slide.durationSeconds}s`);
          console.log(`     - videoUrl: ${slide.videoUrl ? '✅' : '❌'} ${slide.videoUrl?.split('/').pop()}`);
          console.log(`     - url: ${slide.url?.split('/').pop()}`);
        });
        
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

  const computeCountdowns = useCallback((): number[] => {
    if (!slides.length) {
      return [];
    }

    const now = Date.now();
    const startTime = slideStartTimeRef.current ?? now;
    const countdowns = new Array(slides.length).fill(0);
    let accumulatedMs = 0;

    for (let offset = 0; offset < slides.length; offset += 1) {
      const idx = (currentIndex + offset) % slides.length;
      const slide = slides[idx];
      const slideStart = startTime + accumulatedMs;
      const slideEnd = slideStart + slide.durationSeconds * 1000;
      const remainingMs = slideEnd - now;
      countdowns[idx] = Math.max(0, Math.ceil(remainingMs / 1000));
      accumulatedMs += slide.durationSeconds * 1000;
    }

    return countdowns;
  }, [slides, currentIndex]);

  useEffect(() => {
    if (!slides.length) {
      setSlideCountdowns([]);
      return;
    }
    slideStartTimeRef.current = Date.now();
    setSlideCountdowns(computeCountdowns());
  }, [slides, currentIndex, computeCountdowns]);

  useEffect(() => {
    if (!slides.length) return;

    const interval = setInterval(() => {
      setSlideCountdowns(computeCountdowns());
    }, 1000);

    return () => clearInterval(interval);
  }, [slides.length, computeCountdowns]);

  // Handle video transition when current video ends
  const handleVideoEnded = useCallback(() => {
    if (isPaused) return;

    const video = currentVideoRef.current;
    if (!video) return;

    // If only one slide, just loop it
    if (slides.length <= 1) {
      console.log(`🔁 [1/1] Single slide - looping video`);
      video.currentTime = 0;
      video.play().catch(e => console.error('Failed to loop:', e));
      return;
    }

    const nextIndex = (currentIndex + 1) % slides.length;
    const currentSlide = slides[currentIndex];
    const nextSlide = slides[nextIndex];

    const currentDisplayName = currentSlide?.isVideo && currentSlide?.videoUrl 
      ? currentSlide.videoUrl.split('/').pop() || currentSlide?.name
      : currentSlide?.name;

    const nextDisplayName = nextSlide?.isVideo && nextSlide?.videoUrl 
      ? nextSlide.videoUrl.split('/').pop() || nextSlide?.name
      : nextSlide?.name;

    console.log(`🎬 [${currentIndex + 1}/${slides.length}] Video ended: ${currentDisplayName}`);

    // Check if next video is ready
    if (nextVideoReady) {
      console.log(`✅ [${nextIndex + 1}/${slides.length}] Next video ready, transitioning: ${nextDisplayName}`);
      setCurrentIndex(nextIndex);
    } else {
      console.log(`⏳ [${currentIndex + 1}/${slides.length}] Next video not ready (${nextDisplayName}), replaying current`);
      // Replay current video
      video.currentTime = 0;
      video.play().catch(e => console.error('Failed to replay:', e));
    }
  }, [slides, currentIndex, isPaused, nextVideoReady]);

  // Auto-transition when next video becomes ready and current has played enough
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const currentSlide = slides[currentIndex];
    if (!currentSlide) return;

    const currentVideo = currentVideoRef.current;
    if (!currentVideo) return;

    console.log(`🔧 Timer interval started for slide ${currentIndex + 1}/${slides.length}, nextReady: ${nextVideoReady}`);

    // Check if current video has played beyond its duration
    const checkTransition = () => {
      const played = currentVideo.currentTime;
      const duration = currentVideo.duration;
      const targetDuration = currentSlide.durationSeconds;

      // If video has played past its target duration and next is ready, switch
      if (played >= targetDuration && nextVideoReady) {
        const nextIndex = (currentIndex + 1) % slides.length;
        const nextSlide = slides[nextIndex];
        const nextDisplayName = nextSlide?.isVideo && nextSlide?.videoUrl 
          ? nextSlide.videoUrl.split('/').pop() || nextSlide?.name
          : nextSlide?.name;

        console.log(`⏱️ [${currentIndex + 1}/${slides.length}→${nextIndex + 1}/${slides.length}] Target duration reached (${targetDuration}s) and next ready, transitioning: ${nextDisplayName}`);
        setCurrentIndex(nextIndex);
      } else if (played >= targetDuration && !nextVideoReady) {
        // Log waiting state
        if (Math.floor(played) % 2 === 0) { // Log every 2 seconds to avoid spam
          console.log(`⏳ [${currentIndex + 1}/${slides.length}] Waiting for next (played: ${played.toFixed(1)}s / target: ${targetDuration}s)`);
        }
      }
    };

    // Check every 500ms - always run, not dependent on nextVideoReady
    const interval = setInterval(checkTransition, 500);

    return () => {
      console.log(`🛑 Timer interval stopped for slide ${currentIndex + 1}`);
      clearInterval(interval);
    };
  }, [slides, currentIndex, isPaused, nextVideoReady]);

  // Force video play when index changes (critical for webOS)
  useEffect(() => {
    const video = currentVideoRef.current;
    if (!video) return;

    const currentSlide = slides[currentIndex];
    if (!currentSlide || !currentSlide.videoUrl) return;

    const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
    
    console.log(`🎬 [${currentIndex + 1}/${slides.length}] Playing: ${videoName}`);
    
    // Always reset to beginning
    video.currentTime = 0;
    
    // Aggressive play: try immediately and repeatedly
    const tryPlay = (attempt = 1) => {
      video.play()
        .then(() => {
          console.log(`✅ [${currentIndex + 1}] Play success (attempt ${attempt}): ${videoName}`);
        })
        .catch((e) => {
          console.error(`❌ [${currentIndex + 1}] Play failed (attempt ${attempt}): ${videoName}`, e);
          
          // Retry up to 5 times
          if (attempt < 5) {
            console.log(`🔄 [${currentIndex + 1}] Retry in ${attempt * 200}ms...`);
            setTimeout(() => tryPlay(attempt + 1), attempt * 200);
          } else {
            console.error(`❌ [${currentIndex + 1}] All play attempts failed - VIDEO STUCK!`);
          }
        });
    };
    
    // Immediate attempt
    tryPlay(1);
    
    // Also try after short delay for webOS
    const delayTimer = setTimeout(() => {
      if (video.paused) {
        console.log(`⚠️ [${currentIndex + 1}] Video still paused after delay, forcing play`);
        tryPlay(2);
      }
    }, 200);

    return () => clearTimeout(delayTimer);
  }, [currentIndex, slides]);

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
      // Instant transition - no fade
      setCurrentIndex(index);
    }
  }, [slides.length]);

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

  // Updated logic for control overlay visibility
  useEffect(() => {
    const handleUserInteraction = (event: Event) => {
      if (!event.isTrusted) return; // Ignore synthetic events from keep-awake routines

      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000); // Auto-hide after 5 seconds of inactivity
    };

    // Attach event listeners for user interactions
    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      // Cleanup event listeners and timeout on unmount
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

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
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!event.isTrusted) return;

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
          case 'restart':
            goToSlide(0);
            setIsPaused(false);
            break;
          case 'refresh':
            void fetchSlides(true);
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

    return () => {
      supabase.removeChannel(remoteChannel);
    };
  }, [slides, currentIndex, isPaused, goToNextSlide, goToPreviousSlide, goToSlide, fetchSlides]);

  // Broadcast status updates
  useEffect(() => {
    const remoteChannel = supabase.channel('remote-control');
    remoteChannel.httpSend('slideshow-status', {
      total: slides.length,
      current: currentIndex,
      currentImage: slides[currentIndex]?.name || '',
      paused: isPaused,
    }).catch(() => {
      // Ignore errors silently
    });
  }, [slides, currentIndex, isPaused]);

  // Keep screen awake and auto-reload for LG TV - aggressive multi-method approach
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let wakeLock: any = null;
    let activityInterval: NodeJS.Timeout | null = null;
    let keepAliveInterval: NodeJS.Timeout | null = null;
    let hiddenVideoInterval: NodeJS.Timeout | null = null;
    let hiddenVideo: HTMLVideoElement | null = null;

    // Detect webOS browser
    const isWebOS = /webOS|hpwOS/.test(navigator.userAgent);
    
    if (isWebOS) {
      console.log('📺 webOS browser detected - activating aggressive webOS keep-awake');
    } else {
      console.log('🔋 LG TV keep-awake system activated (non-webOS mode)');
    }

    // 0. Create hidden video for continuous playback (tricks OS into staying awake)
    const createHiddenVideo = () => {
      try {
        hiddenVideo = document.createElement('video');
        hiddenVideo.style.display = 'none';
        hiddenVideo.style.visibility = 'hidden';
        hiddenVideo.style.position = 'fixed';
        hiddenVideo.style.top = '-9999px';
        
        // Create a silent video blob
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1, 1);
        }
        
        canvas.toBlob((blob) => {
          if (blob && hiddenVideo) {
            const url = URL.createObjectURL(blob);
            hiddenVideo.src = url;
            hiddenVideo.loop = true;
            hiddenVideo.muted = true;
            hiddenVideo.volume = 0;
            
            // Try to play the video
            const playPromise = hiddenVideo.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                console.log('⚠️ Hidden video autoplay blocked');
              });
            }
            console.log('🎬 Hidden video created for keep-awake');
          }
        });
        
        document.body.appendChild(hiddenVideo);
      } catch (e) {
        console.log('⚠️ Could not create hidden video');
      }
    };

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
          (window as any).webOS.service.request('luna://com.palm.powermanager/', {
            method: 'activityStart',
            parameters: {
              id: 'slideshow-display-app',
              reason: 'Display slideshow content'
            },
            onSuccess: () => {
              console.log('✅ webOS activity started');
            },
            onFailure: () => {
              console.log('⚠️ webOS activity start failed');
            }
          });
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
        }),
        new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: 'Shift',
        }),
        new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight,
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
      
      console.log('🖱️ Activity simulation triggered');
    };

    // 4. Prevent visibility change sleep
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        simulateActivity();
        if (isWebOS) {
          webOSKeepAwake();
        }
      }
    };

    // 5. Force full screen mode (helps prevent LG TV timeout)
    const requestFullscreen = () => {
      try {
        const elem = document.documentElement;
        const fullscreenElement = document.fullscreenElement
          || (document as any).webkitFullscreenElement
          || (document as any).mozFullScreenElement
          || (document as any).msFullscreenElement;

        const userActivation = typeof navigator !== 'undefined' && (navigator as any).userActivation
          ? (navigator as any).userActivation
          : null;

        const canInitiate = fullscreenElement
          || !userActivation
          || userActivation.isActive;

        if (!canInitiate) {
          return;
        }

        const markRequested = () => {
          fullscreenRequestedRef.current = true;
        };

        if (elem.requestFullscreen && !fullscreenElement) {
          elem.requestFullscreen().then(markRequested).catch(() => {});
        } else if ((elem as any).webkitRequestFullscreen && !fullscreenElement) {
          (elem as any).webkitRequestFullscreen();
          markRequested();
        } else if ((elem as any).mozRequestFullScreen && !fullscreenElement) {
          (elem as any).mozRequestFullScreen();
          markRequested();
        } else if ((elem as any).msRequestFullscreen && !fullscreenElement) {
          (elem as any).msRequestFullscreen();
          markRequested();
        }
      } catch (e) {
        console.log('⚠️ Fullscreen request failed');
      }
    };

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement
        || (document as any).webkitFullscreenElement
        || (document as any).mozFullScreenElement
        || (document as any).msFullscreenElement;
      fullscreenRequestedRef.current = Boolean(fullscreenElement);
    };

    // 6. Aggressive continuous keep-alive (every 5 minutes)
    const continuousKeepAlive = () => {
      simulateActivity();
      requestWakeLock();
      if (isWebOS) {
        webOSKeepAwake();
      }
      console.log('⚡ Continuous keep-alive trigger');
    };

    // Initialize all methods on startup
    requestWakeLock();
    createHiddenVideo();
    
    // Try to enter fullscreen immediately
    setTimeout(requestFullscreen, 2000);
    
    // webOS keep-awake on startup
    if (isWebOS) {
      setTimeout(webOSKeepAwake, 1000);
      setTimeout(webOSKeepAwake, 5000);
    }
    
    // Aggressive continuous keep-alive every 2 minutes (faster for short videos)
    keepAliveInterval = setInterval(() => {
      continuousKeepAlive();
    }, 2 * 60 * 1000); // Every 2 minutes
    
    // Activity simulation every 5 minutes (more frequent)
    activityInterval = setInterval(() => {
      simulateActivity();
      console.log('⏰ 5-minute activity trigger');
    }, 5 * 60 * 1000); // 5 minutes
    
    // Retry fullscreen every 10 minutes
    hiddenVideoInterval = setInterval(() => {
      requestFullscreen();
      if (isWebOS) {
        webOSKeepAwake();
      }
    }, 10 * 60 * 1000); // Every 10 minutes
    
    // Re-request wake lock on visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange as any);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as any);
    
    // Also trigger on user interaction
    const triggerOnInteraction = () => {
      requestWakeLock();
      simulateActivity();
      requestFullscreen();
    };
    
    document.addEventListener('click', triggerOnInteraction, { once: true });
    document.addEventListener('keydown', triggerOnInteraction, { once: true });
    document.addEventListener('touchstart', triggerOnInteraction, { once: true });

    // Cleanup
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
      if (activityInterval) {
        clearInterval(activityInterval);
      }
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      if (hiddenVideoInterval) {
        clearInterval(hiddenVideoInterval);
      }
      if (hiddenVideo && hiddenVideo.parentNode) {
        hiddenVideo.parentNode.removeChild(hiddenVideo);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as any);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange as any);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as any);
      document.removeEventListener('click', triggerOnInteraction);
      document.removeEventListener('keydown', triggerOnInteraction);
      document.removeEventListener('touchstart', triggerOnInteraction);
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
  
  // Debug logging
  console.log(`🎯 Rendering slide ${currentIndex + 1}/${slides.length}:`, {
    hasSlide: !!currentSlide,
    hasVideoUrl: !!currentSlide?.videoUrl,
    videoUrl: currentSlide?.videoUrl?.split('/').pop(),
    nextVideoReady,
  });

  const formatCountdown = (seconds?: number) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) {
      return "--:--";
    }
    const totalSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main style={styles.container}>
      <Head>
        <title>Slideshow</title>
      </Head>
      
      {/* Single video element with instant transition (no fade) */}
      <div style={styles.imageWrapper}>
        {currentSlide && currentSlide.videoUrl ? (
          <video
            ref={currentVideoRef}
            src={currentSlide.videoUrl}
            autoPlay
            muted
            playsInline
            loop={slides.length <= 1}
            preload="auto"
            webkit-playsinline="true"
            x-webkit-airplay="allow"
            style={styles.image}
            onLoadStart={() => {
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`🔵 [${currentIndex + 1}/${slides.length}] Video load started - ${videoName}`);
            }}
            onLoadedMetadata={() => {
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`📊 [${currentIndex + 1}/${slides.length}] Video metadata loaded - ${videoName}`);
            }}
            onCanPlay={() => {
              const video = currentVideoRef.current;
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`✅ [${currentIndex + 1}/${slides.length}] Video can play - ${videoName}`);
              // Ensure video starts playing
              if (video) {
                if (video.paused) {
                  console.log(`▶️ [${currentIndex + 1}] onCanPlay: forcing play - ${videoName}`);
                  video.play()
                    .then(() => console.log(`✅ onCanPlay play success`))
                    .catch(e => console.error('onCanPlay play failed:', e));
                } else {
                  console.log(`▶️ [${currentIndex + 1}] onCanPlay: already playing`);
                }
              }
            }}
            onLoadedData={() => {
              const video = currentVideoRef.current;
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`📺 [${currentIndex + 1}/${slides.length}] WebOS: Video loaded, attempting play - ${videoName}`);
              if (video) {
                // WebOS-friendly play with multiple retries
                const attemptPlay = (retryCount = 0) => {
                  video.play()
                    .then(() => {
                      console.log(`✅ Current play success - ${videoName}`);
                    })
                    .catch((e: any) => {
                      if (retryCount < 3) {
                        console.warn(`⚠️ WebOS: Current play attempt ${retryCount + 1} failed, retrying...`);
                        setTimeout(() => attemptPlay(retryCount + 1), 200 * (retryCount + 1));
                      } else {
                        console.error(`❌ WebOS: All play attempts failed - ${videoName}`, e);
                      }
                    });
                };
                attemptPlay();
              }
            }}
            onPlay={() => {
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`▶️ Video playing - ${videoName}`);
              // Trigger keep-awake when video starts playing
              if (typeof document !== 'undefined') {
                document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
              }
            }}
            onTimeUpdate={(e) => {
              // Trigger keep-awake every 10 seconds during playback (throttled for webOS performance)
              const video = e.target as HTMLVideoElement;
              const now = Date.now();
              const currentSecond = Math.floor(video.currentTime);
              
              // Only trigger if we haven't triggered in the last 9 seconds
              if (currentSecond > 0 && currentSecond % 10 === 0 && (now - lastKeepAwakeTimeRef.current) > 9000) {
                lastKeepAwakeTimeRef.current = now;
                if (typeof document !== 'undefined') {
                  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
                }
              }
            }}
            onEnded={() => {
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`🎬 Video ended - ${videoName}`);
              
              // Trigger keep-awake
              if (typeof document !== 'undefined') {
                document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
              }

              // Handle transition to next video
              handleVideoEnded();
            }}
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              const error = target.error;
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.error(`❌ Video error - ${videoName}`);
              console.error(`   Error code: ${error?.code}`);
              console.error(`   Error message: ${error?.message}`);
              console.error(`   Video URL: ${currentSlide.videoUrl}`);
              console.error(`   MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3, MEDIA_ERR_SRC_NOT_SUPPORTED: 4`);
            }}
            onCanPlayThrough={() => {
              const video = currentVideoRef.current;
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`✅ Can play through: ${videoName}`);
              
              // Auto-cache video on first successful load
              if (currentSlide.videoUrl && !cachedVideos.has(currentSlide.videoUrl)) {
                console.log(`💾 Auto-caching video: ${videoName}`);
                
                // Fetch and cache the video blob
                fetch(currentSlide.videoUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    cacheVideo(currentSlide.videoUrl!, blob)
                      .then(() => {
                        setCachedVideos(prev => new Set(prev).add(currentSlide.videoUrl!));
                        console.log(`✅ Video cached successfully: ${videoName}`);
                      })
                      .catch(err => console.error(`❌ Failed to cache video: ${videoName}`, err));
                  })
                  .catch(err => console.error(`❌ Failed to fetch video for caching: ${videoName}`, err));
              } else if (currentSlide.videoUrl && cachedVideos.has(currentSlide.videoUrl)) {
                console.log(`✅ Using cached video: ${videoName}`);
              }
              
              // Force play on canplaythrough as well
              if (video && video.paused) {
                console.log(`▶️ Forcing play from canplaythrough: ${videoName}`);
                video.play().catch(e => console.error('canplaythrough play failed:', e));
              }
            }}
            onStalled={() => {
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.warn(`⚠️ Video stalled - ${videoName}`);
            }}
            onWaiting={() => {
              const videoName = currentSlide.videoUrl?.split('/').pop() || currentSlide.name;
              console.log(`⏳ Video waiting - ${videoName}`);
            }}
          />
        ) : currentSlide ? (
          <div style={{
            ...styles.image,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontSize: '18px',
            textAlign: 'center',
            padding: '40px',
            gap: '20px',
          }}>
            {(() => {
              console.log(`⚠️ No videoUrl for slide ${currentIndex + 1}: ${currentSlide.name}`);
              return null;
            })()}
            <div style={{ fontSize: '24px', color: '#ff6b6b' }}>⚠️ No Video Available</div>
            <div style={{ fontSize: '16px', color: '#aaa' }}>{currentSlide.name}</div>
            <div style={{ fontSize: '14px', color: '#666', maxWidth: '600px', wordBreak: 'break-all' }}>
              Video URL: {currentSlide.videoUrl || 'Not generated'}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Please generate video from admin panel
            </div>
          </div>
        ) : (
          <div style={{
            ...styles.image,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontSize: '24px',
            textAlign: 'center',
            padding: '40px',
          }}>
            No slides available
          </div>
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
          {currentSlide && (
            <div style={styles.slideInfo}>
              {currentSlide.isVideo && currentSlide.videoUrl 
                ? currentSlide.videoUrl.split('/').pop() 
                : currentSlide.name} • Sisa waktu: {formatCountdown(slideCountdowns[currentIndex] ?? currentSlide.durationSeconds)}
            </div>
          )}
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

          {/* Thumbnail grid - Video thumbnails */}
          <div style={styles.thumbnailGrid}>
            {slides.map((slide, index) => (
              <div
                key={slide.name}
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => goToSlide(index)}
              >
                <span style={styles.slideNumber}>{index + 1}</span>
                <span style={styles.countdownBadge}>
                  {formatCountdown(slideCountdowns[index] ?? slide.durationSeconds)}
                </span>
                {slide.isVideo && slide.videoUrl ? (
                  <>
                    <video
                      src={slide.videoUrl}
                      muted
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
                    <div style={styles.videoPlayIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </>
                ) : (
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
                )}
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
