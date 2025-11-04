import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { supabase } from "../lib/supabase";

const DEFAULT_SLIDE_DURATION_SECONDS = 12;
const LANGUAGE_SWAP_INTERVAL_MS = 4_000;
const FADE_DURATION_MS = 1000;
const AUTO_REFRESH_INTERVAL_MS = 60_000; // Check for new images every 60 seconds

type Language = "en" | "ko" | "id";
const LANGUAGE_SEQUENCE: Language[] = ["en", "ko", "id"];

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
    en: "Checking Supabase storage for the latest dashboards. This screen refreshes automatically.",
    ko: "최신 대시보드를 확인하고 있습니다. 이 화면은 자동으로 새로 고쳐집니다.",
    id: "Memeriksa penyimpanan Supabase untuk dashboard terbaru. Tampilan ini akan diperbarui otomatis.",
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
  const slidesRef = useRef<Slide[]>([]);
  const indexRef = useRef(0);

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

      const fetchedSlides = payload.images.map((filename) => {
        const durationMs = imageDurations[filename];
        const durationSeconds =
          typeof durationMs === "number" && durationMs > 0
            ? Math.max(1, Math.round(durationMs / 1000))
            : DEFAULT_SLIDE_DURATION_SECONDS;
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

  // Auto-rotate slides with smooth fade
  useEffect(() => {
    if (slides.length <= 1) {
      console.log(`⏸️ Not rotating: ${slides.length} slide(s)`);
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
  }, [slides, currentIndex]);

  // Rotate language
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LANGUAGE_SEQUENCE.length;
      setLanguage(LANGUAGE_SEQUENCE[index]);
    }, LANGUAGE_SWAP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Keep screen awake - prevent screensaver on Smart TV
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let wakeLock: any = null;

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

    // 2. Prevent sleep with video element trick (works on many Smart TVs)
    const createNoSleepVideo = () => {
      const video = document.createElement('video');
      video.setAttribute('loop', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.style.position = 'absolute';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      
      // Minimal WebM video (1 second, black frame)
      const webmData = 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh1WGQ2hyb2lztLYBAAAAAAUKAAAAAAABAWVibWKHg/////91AA4GhgeBAJFhEACEgQFVsIRVuYEBElTrEAAAAAAAZp+BAAAAAAAq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFhJFg////0kFRN0BGVP///////wAAAAADL/////qGgP////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGa1Eg3ERMiWjkBInAr+DIgeISLAqJ0SCBAULnBIQjNKAAAAAAAz4PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWc+2RuZJ2WPeTPdMjeqt7lOmR1XNubXeNeHcmutVQIJRBwIKJFsEJRQSCCdN9P+hETAdL4aDUAAAAAAAAADXXq87qWuK7KQ7oSoZowjmj7MV0V2Hud9FqLPjFWr+7I4AAAAA';
      
      video.src = webmData;
      document.body.appendChild(video);
      
      const playVideo = () => {
        video.play().catch(() => {
          // Retry on user interaction
          document.addEventListener('click', () => video.play(), { once: true });
        });
      };
      
      playVideo();
      return video;
    };

    // 3. Periodic activity simulation (fallback for older Smart TVs)
    const simulateActivity = () => {
      // Trigger mousemove event every 30 seconds
      const event = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight,
      });
      document.dispatchEvent(event);
    };

    // 4. Prevent visibility change sleep
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    // Initialize all methods
    const noSleepVideo = createNoSleepVideo();
    requestWakeLock();
    
    // Simulate activity every 30 seconds
    const activityInterval = setInterval(simulateActivity, 30000);
    
    // Re-request wake lock on visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
      if (noSleepVideo && noSleepVideo.parentNode) {
        noSleepVideo.pause();
        noSleepVideo.parentNode.removeChild(noSleepVideo);
      }
      clearInterval(activityInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading || error) {
    return (
      <main style={styles.container}>
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

  return (
    <main style={styles.container}>
      <div 
        style={{
          ...styles.imageWrapper,
          opacity: fadeIn ? 1 : 0,
          transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
        }}
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
    </main>
  );
}
