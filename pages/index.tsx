import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { useSlideshow } from "../hooks/useSlideshow";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { useVideoPreload } from "../hooks/useVideoPreload";
import { useKeepAwake } from "../hooks/useKeepAwake";
import { useRemoteControl } from "../hooks/useRemoteControl";

const DEFAULT_SLIDE_DURATION_SECONDS = 20;
const LANGUAGE_SWAP_INTERVAL_MS = 4_000;
const AUTO_REFRESH_INTERVAL_MS = 60_000;

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

type AppError = { kind: "fetch"; detail?: string } | { kind: "unknown"; detail?: string };

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
    margin: 0,
  },
  accentBadge: {
    padding: "6px 14px",
    borderRadius: "9999px",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    color: "#bae6fd",
    fontSize: "0.78rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    fontWeight: 600,
  },
  subtleText: {
    color: "rgba(226, 232, 240, 0.75)",
    fontSize: "0.9rem",
    textAlign: "center" as const,
    lineHeight: 1.6,
    margin: 0,
  },
  glow: {
    position: "absolute",
    width: "52vw",
    height: "52vw",
    maxWidth: "720px",
    maxHeight: "720px",
    background: "radial-gradient(circle, rgba(56, 189, 248, 0.18), transparent 60%)",
    filter: "blur(60px)",
    transform: "translate(-20%, -10%)",
    zIndex: 1,
    pointerEvents: "none" as const,
  },
  fadeText: {
    fontSize: "0.8rem",
    letterSpacing: "0.42em",
    textTransform: "uppercase" as const,
    color: "rgba(148, 163, 184, 0.7)",
  },
  controlsOverlay: {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 100,
    transition: "opacity 300ms ease",
    opacity: 1,
  },
  controlsOverlayHidden: {
    opacity: 0,
    pointerEvents: "none" as const,
  },
  controlsContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: "30px 40px",
    borderRadius: "16px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    justifyContent: "center" as const,
  },
  controlButton: {
    padding: "1rem 2rem",
    fontSize: "1.1rem",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [showControls, setShowControls] = useState(false);

  // Main slideshow controller
  const {
    currentIndex,
    isPaused,
    goToNext,
    goToPrevious,
    goToSlide,
    togglePause,
    handleVideoEnded: onSlideshowEnded,
    currentSlide,
  } = useSlideshow({ slides });

  // Video preload management
  const {
    nextVideoReady,
    resetPreloadFlag,
    handleTimeUpdate: onPreloadTimeUpdate,
  } = useVideoPreload({
    slides,
    currentIndex,
    preloadTriggerPercent: 0.5,
  });

  // Video player with webOS optimization
  const {
    videoRef,
    play,
  } = useVideoPlayer({
    videoUrl: currentSlide?.videoUrl || null,
    isPaused,
    onEnded: onSlideshowEnded,
    onTimeUpdate: onPreloadTimeUpdate,
  });

  // Keep webOS TV awake
  useKeepAwake(!isPaused);

  // Resource hints for Supabase
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

  // Fetch slides from API
  const fetchSlides = useCallback(async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) setLoading(true);

      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/api/images${cacheBuster}`, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load: ${response.statusText}`);
      }

      const payload: {
        images: Array<{ name: string; isVideo?: boolean; videoUrl?: string }>;
        durations?: Record<string, number | null>;
      } = await response.json();

      let imageDurations: Record<string, number> = {};
      if (payload.durations) {
        Object.entries(payload.durations).forEach(([key, value]) => {
          if (typeof value === "number" && !Number.isNaN(value)) {
            imageDurations[key] = value;
          }
        });
      }

      const fetchedSlides = payload.images
        .filter((item) => item.isVideo) // Only include videos
        .map((item) => {
          const durationMs = imageDurations[item.name];
          const durationSeconds =
            typeof durationMs === "number" && durationMs > 0
              ? Math.max(1, Math.round(durationMs / 1000))
              : DEFAULT_SLIDE_DURATION_SECONDS;

          return {
            name: item.name,
            url: item.videoUrl || "",
            durationSeconds,
            isVideo: item.isVideo,
            videoUrl: item.videoUrl,
          };
        });

      console.log(`✅ Fetched ${fetchedSlides.length} slides`);
      setSlides(fetchedSlides);
      setError(null);

      return fetchedSlides;
    } catch (err) {
      console.error("❌ Error fetching slides:", err);
      if (!isAutoRefresh) {
        setError({ kind: "fetch", detail: err instanceof Error ? err.message : undefined });
      }
      return null;
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Auto-refresh slides
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh check...');
      fetchSlides(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchSlides]);

  // Language rotation
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LANGUAGE_SEQUENCE.length;
      setLanguage(LANGUAGE_SEQUENCE[index]);
    }, LANGUAGE_SWAP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Remote control integration
  useRemoteControl({
    slides,
    currentIndex,
    isPaused,
    goToNext,
    goToPrevious,
    goToSlide,
    togglePause,
    fetchSlides,
  });

  // Send initial status when slides are loaded
  useEffect(() => {
    if (slides.length > 0) {
      console.log('📡 Slides loaded, broadcasting initial status');
      const channel = supabase.channel('remote-control-status-init');
      channel.send({
        type: 'broadcast',
        event: 'slideshow-status',
        payload: {
          total: slides.length,
          current: currentIndex,
          currentImage: slides[currentIndex]?.name || '',
          paused: isPaused,
        }
      }).then(() => {
        console.log('✅ Initial status sent');
        supabase.removeChannel(channel);
      }).catch((err) => {
        console.error('❌ Failed to send initial status:', err);
        supabase.removeChannel(channel);
      });
    }
  }, [slides.length]); // Only when slides first load

  // Reset preload flag when slide changes
  useEffect(() => {
    resetPreloadFlag();
  }, [currentIndex, resetPreloadFlag]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          goToNext();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case " ":
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, togglePause]);

  // Mouse movement handler for controls
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      
      // Clear existing timeout
      if (hideTimeout) clearTimeout(hideTimeout);
      
      // Hide controls after 3 seconds of inactivity
      hideTimeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  // Supabase realtime listener for metadata changes
  useEffect(() => {
    const channel = supabase
      .channel("image-metadata-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "image_durations" },
        () => {
          console.log("📡 Metadata change detected");
          fetchSlides(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSlides]);

  // Force play when currentIndex changes (critical for webOS)
  useEffect(() => {
    if (currentSlide?.videoUrl && !isPaused) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        play().catch(e => console.error('Failed to play:', e));
      }
    }
  }, [currentIndex, currentSlide, isPaused, play, videoRef]);

  // Loading state
  if (loading) {
    return (
      <>
        <Head>
          <title>Slideshow</title>
        </Head>
        {ResourceHints}
        <main style={styles.container}>
          <div style={styles.glow} />
          <div style={styles.placeholderCard}>
            <span style={styles.accentBadge}>
              {translations.badgeUpdating[language]}
            </span>
            <h2 style={styles.noSlidesMessage}>
              {translations.loading[language]}
            </h2>
            <p style={styles.subtleText}>
              {translations.loadingSubtext[language]}
            </p>
          </div>
        </main>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Head>
          <title>Slideshow</title>
        </Head>
        {ResourceHints}
        <main style={styles.container}>
          <div style={styles.glow} />
          <div style={styles.placeholderCard}>
            <span style={styles.accentBadge}>
              {translations.badgeWarning[language]}
            </span>
            <h2 style={styles.noSlidesMessage}>
              {translations.fetchError[language]}
            </h2>
            <p style={styles.subtleText}>
              {translations.errorSubtext[language]}
            </p>
          </div>
        </main>
      </>
    );
  }

  // No slides state
  if (slides.length === 0) {
    return (
      <>
        <Head>
          <title>Slideshow</title>
        </Head>
        {ResourceHints}
        <main style={styles.container}>
          <div style={styles.glow} />
          <div style={styles.placeholderCard}>
            <span style={styles.accentBadge}>
              {translations.badgeReady[language]}
            </span>
            <h2 style={styles.noSlidesMessage}>
              {translations.noSlides[language]}
            </h2>
            <p style={styles.subtleText}>
              {translations.noSlidesSubtext[language]}
            </p>
            <span style={styles.fadeText}>
              {translations.noSlidesFooter[language]}
            </span>
          </div>
        </main>
      </>
    );
  }

  // Main slideshow render
  return (
    <>
      <Head>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Head>
      {ResourceHints}
      <main style={styles.container}>
        <div style={styles.imageWrapper}>
          {currentSlide && currentSlide.videoUrl ? (
            <video
              ref={videoRef}
              src={currentSlide.videoUrl}
              autoPlay
              muted
              playsInline
              loop={slides.length <= 1}
              preload="auto"
              style={styles.image}
              onLoadStart={() => {
                console.log(`🔵 Loading: ${currentSlide.name}`);
              }}
              onLoadedMetadata={() => {
                console.log(`📊 Metadata loaded: ${currentSlide.name}`);
              }}
              onCanPlay={() => {
                console.log(`✅ Can play: ${currentSlide.name}`);
              }}
              onPlay={() => {
                console.log(`▶️ Playing: ${currentSlide.name}`);
              }}
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                const error = target.error;
                console.error(`❌ Video error: ${currentSlide.name}`);
                console.error(`   Error code: ${error?.code}, message: ${error?.message}`);
              }}
            />
          ) : null}
        </div>

        {/* Controls overlay */}
        {currentSlide && (
          <div 
            style={{
              ...styles.controlsOverlay,
              ...(showControls ? {} : styles.controlsOverlayHidden)
            }}
          >
            <div style={styles.controlsContainer}>
              <div style={styles.controlsRow}>
                <button
                  style={styles.controlButton}
                  onClick={goToPrevious}
                  aria-label="Previous slide"
                >
                  ⏮️ Previous
                </button>
                <button
                  style={styles.controlButton}
                  onClick={togglePause}
                  aria-label={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button
                  style={styles.controlButton}
                  onClick={goToNext}
                  aria-label="Next slide"
                >
                  Next ⏭️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug info - REMOVED per user request */}
      </main>
    </>
  );
}
