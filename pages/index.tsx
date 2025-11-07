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
  imageGalleryBottomBar: {
    position: "fixed" as const,
    left: 0,
    bottom: 0,
    width: "100vw",
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.97) 20%, rgba(15, 23, 42, 0.99) 100%)",
    backdropFilter: "blur(24px)",
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    padding: "32px 56px 32px",
    zIndex: 50,
    boxShadow: "0 -12px 48px rgba(0, 0, 0, 0.5), 0 -4px 16px rgba(0, 0, 0, 0.3)",
    transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    transform: "translateY(0)",
    opacity: 1,
  },
  imageGalleryBottomBarHidden: {
    transform: "translateY(calc(100% + 10px))",
    opacity: 0,
    pointerEvents: "none" as const,
  },
  galleryTitle: {
    color: "rgba(248, 250, 252, 1)",
    fontSize: "0.875rem",
    fontWeight: 700,
    marginBottom: "20px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  },
  galleryBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.15) 100%)",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "rgba(186, 230, 253, 1)",
    letterSpacing: "0.03em",
    boxShadow: "0 2px 8px rgba(56, 189, 248, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "24px",
    maxHeight: "240px",
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    paddingRight: "12px",
    paddingBottom: "4px",
  },
  galleryImageCard: {
    position: "relative" as const,
    aspectRatio: "1",
    borderRadius: "16px",
    overflow: "hidden",
    cursor: "pointer",
    border: "2px solid rgba(148, 163, 184, 0.25)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  galleryImageName: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: "10px 12px",
    background: "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.85) 30%, rgba(0, 0, 0, 0.95) 100%)",
    backdropFilter: "blur(12px)",
    color: "rgba(255, 255, 255, 1)",
    fontSize: "0.8rem",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    opacity: 0,
    transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
  },
  imagePreviewOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "linear-gradient(to bottom right, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))",
    backdropFilter: "blur(24px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    animation: "fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    padding: "32px",
  },
  previewImageContainer: {
    position: "relative" as const,
    maxWidth: "95vw",
    maxHeight: "95vh",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.03)",
    boxShadow: "0 24px 80px -32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(12px)",
  },
  previewImage: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "95vh",
    width: "auto",
    height: "auto",
    objectFit: "contain" as const,
    borderRadius: "24px",
  },

};
export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [adminImages, setAdminImages] = useState<Array<{name: string; url: string}>>([]);
  const [selectedImage, setSelectedImage] = useState<{name: string; url: string} | null>(null);
  const [wasPaused, setWasPaused] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

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

  // Fetch admin images (exclude placeholders from merge-video)
  const fetchAdminImages = useCallback(async () => {
    try {
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/api/images${cacheBuster}`, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) return;

      const payload: {
        images: Array<{ name: string; isVideo?: boolean; videoUrl?: string; hidden?: boolean }>;
      } = await response.json();

      // Filter: only actual images (not videos, not hidden placeholders)
      const images = payload.images
        .filter((item) => !item.isVideo && !item.hidden)
        .map((item) => ({
          name: item.name,
          url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/slideshow-images/${item.name}`,
        }));

      console.log(`✅ Fetched ${images.length} admin images`);
      setAdminImages(images);
    } catch (err) {
      console.error("❌ Error fetching admin images:", err);
    }
  }, []);

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
        .filter((item) => item.isVideo && item.videoUrl) // Only include videos
        .map((item) => {
          const durationMs = imageDurations[item.name];
          const durationSeconds =
            typeof durationMs === "number" && durationMs > 0
              ? Math.max(1, Math.round(durationMs / 1000))
              : DEFAULT_SLIDE_DURATION_SECONDS;

          console.log(`[Slide Debug] ${item.name}:`, {
            isVideo: item.isVideo,
            videoUrl: item.videoUrl,
            durationSeconds
          });

          return {
            name: item.name,
            url: item.videoUrl || "",
            durationSeconds,
            isVideo: item.isVideo,
            videoUrl: item.videoUrl,
          };
        });

      console.log(`✅ Fetched ${fetchedSlides.length} video slides`);
      console.log(`📹 First video:`, fetchedSlides[0]);
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
    fetchAdminImages();
  }, [fetchSlides, fetchAdminImages]);

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
      }, { httpSend: true }).then(() => {
        console.log('✅ Initial status sent');
        supabase.removeChannel(channel);
      }).catch((err) => {
        console.error('❌ Failed to send initial status:', err);
        supabase.removeChannel(channel);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        case "Escape":
          // Close selected image preview
          if (selectedImage) {
            setSelectedImage(null);
            if (!wasPaused) {
              togglePause(); // Resume if it was playing before
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, togglePause, selectedImage, wasPaused]);

  // Handle image selection
  const handleImageClick = useCallback((image: {name: string; url: string}) => {
    setWasPaused(isPaused);
    if (!isPaused) {
      togglePause(); // Pause video slideshow
    }
    setSelectedImage(image);
  }, [isPaused, togglePause]);

  const handleClosePreview = useCallback(() => {
    setSelectedImage(null);
    if (!wasPaused) {
      togglePause(); // Resume if it was playing before
    }
  }, [wasPaused, togglePause]);

  // Mouse movement handler for gallery show/hide
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;
    const BOTTOM_TRIGGER_HEIGHT = 150; // pixels from bottom to trigger gallery

    const handleMouseMove = (e: MouseEvent) => {
      // Don't show gallery if image preview is open
      if (selectedImage) return;

      const distanceFromBottom = window.innerHeight - e.clientY;

      // Show gallery if mouse is near bottom
      if (distanceFromBottom <= BOTTOM_TRIGGER_HEIGHT) {
        setShowGallery(true);
        
        // Clear existing timeout
        if (hideTimeout) clearTimeout(hideTimeout);
        
        // Hide gallery after 3 seconds of inactivity
        hideTimeout = setTimeout(() => {
          setShowGallery(false);
        }, 3000);
      } else if (distanceFromBottom > 300) {
        // Hide immediately if mouse moves far from bottom
        setShowGallery(false);
        if (hideTimeout) clearTimeout(hideTimeout);
      }
    };

    const handleTouch = (e: TouchEvent) => {
      // Don't show gallery if image preview is open
      if (selectedImage) return;

      const touch = e.touches[0];
      const distanceFromBottom = window.innerHeight - touch.clientY;

      if (distanceFromBottom <= BOTTOM_TRIGGER_HEIGHT) {
        setShowGallery(true);
        
        if (hideTimeout) clearTimeout(hideTimeout);
        
        hideTimeout = setTimeout(() => {
          setShowGallery(false);
        }, 3000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [selectedImage]);

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
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes slideIn {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .gallery-image-card {
          .gallery-image-card {
            position: relative;
          }
          .gallery-image-card:hover {
            border-color: rgba(56, 189, 248, 0.9) !important;
            transform: translateY(-6px) scale(1.03) !important;
            box-shadow: 0 12px 32px rgba(56, 189, 248, 0.3), 0 0 0 2px rgba(56, 189, 248, 0.4), 0 4px 16px rgba(0, 0, 0, 0.4) !important;
          }
          .gallery-image-card:hover img {
            transform: scale(1.08);
          }
          .gallery-image-card:hover .gallery-image-name {
            opacity: 1;
          }
          .gallery-image-card:active {
            transform: translateY(-3px) scale(1.02) !important;
          }
            transform: scale(1.05);
          }
          .gallery-grid::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .gallery-grid::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .gallery-grid::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }
          .gallery-grid::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(148, 163, 184, 0.5) 0%, rgba(148, 163, 184, 0.7) 100%);
            border-radius: 4px;
            border: 2px solid rgba(15, 23, 42, 0.3);
          }
          .gallery-grid::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(148, 163, 184, 0.7) 0%, rgba(148, 163, 184, 0.9) 100%);
          }
          .gallery-grid::-webkit-scrollbar-corner {
            background: transparent;
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

        {/* Image Gallery Bottom Bar */}
        <div 
          style={{
            ...styles.imageGalleryBottomBar,
            ...(showGallery ? {} : styles.imageGalleryBottomBarHidden)
          }}
          className="gallery-bottom-bar"
        >
          <div style={styles.galleryTitle}>
            <span>📁 Image Gallery</span>
            <span style={styles.galleryBadge}>{adminImages.length} {adminImages.length === 1 ? 'Image' : 'Images'}</span>
          </div>
          <div style={styles.galleryGrid} className="gallery-grid">
            {adminImages.map((image) => (
              <div
                key={image.name}
                style={styles.galleryImageCard}
                className="gallery-image-card"
                onClick={() => handleImageClick(image)}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  style={styles.galleryImage}
                  loading="lazy"
                />
                <div style={styles.galleryImageName} className="gallery-image-name">
                  {image.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')}
                </div>
              </div>
            ))}
          </div>
          {adminImages.length === 0 && (
            <div style={{ 
              color: "rgba(148, 163, 184, 0.6)", 
              fontSize: "0.875rem", 
              textAlign: "center", 
              marginTop: "16px",
              padding: "20px",
              fontStyle: "italic"
            }}>
              No images available in gallery
            </div>
          )}
        </div>

        {/* Image Preview Overlay */}
        {selectedImage && (
          <div style={styles.imagePreviewOverlay} onClick={handleClosePreview}>
            <div style={styles.previewImageContainer}>
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                style={styles.previewImage}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
