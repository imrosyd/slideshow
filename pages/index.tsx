import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { useSlideshow } from "../hooks/useSlideshow";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { useVideoPreload } from "../hooks/useVideoPreload";
import { useKeepAwake } from "../hooks/useKeepAwake";

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
    backgroundColor: "#000",
    margin: 0,
    padding: 0,
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  errorContainer: {
    textAlign: "center",
    padding: "2rem",
    color: "#fff",
  },
};

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");

  // Main slideshow controller
  const {
    currentIndex,
    isPaused,
    goToNext,
    goToPrevious,
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
        {ResourceHints}
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <h1>{translations.loading[language]}</h1>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        {ResourceHints}
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <h1>{translations.fetchError[language]}</h1>
            <p>{error.detail}</p>
          </div>
        </div>
      </>
    );
  }

  // No slides state
  if (slides.length === 0) {
    return (
      <>
        {ResourceHints}
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <h1>{translations.noSlides[language]}</h1>
          </div>
        </div>
      </>
    );
  }

  // Main slideshow render
  return (
    <>
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

        {/* Debug info - REMOVED per user request */}
      </main>
    </>
  );
}
