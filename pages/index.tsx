// @ts-nocheck
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase-mock";
import { useSlideshow } from "../hooks/useSlideshow";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { useVideoPreload } from "../hooks/useVideoPreload";
import { useKeepAwake } from "../hooks/useKeepAwake";
import useSingleVideoLoop from "../hooks/useSingleVideoLoop";
import { useDeviceId } from "../hooks/useDeviceId";
import { useHeartbeat } from "../hooks/useHeartbeat";
import type { Command } from "../lib/state-manager";

const AUTO_REFRESH_INTERVAL_MS = 30_000; // Increase to reduce server load
const FAST_REFRESH_INTERVAL_MS = 2_000; // Fast refresh after video updates
const LANGUAGE_SWAP_INTERVAL_MS = 5_000;
const DEFAULT_SLIDE_DURATION_SECONDS = 10;
const LANGUAGE_SEQUENCE: Language[] = ["en", "id", "ko"];

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
  videoHash?: string | null;
  videoDurationSeconds?: number;
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
    background: `linear-gradient(180deg, rgba(0, 7, 28, 0.88) 0%, rgba(7, 14, 39, 0.94) 60%,rgba(12, 18, 44, 0.97) 100%)`,
    backdropFilter: "blur(18px)",
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    padding: "clamp(4px, 0.5vw, 8px) clamp(8px, 1vw, 16px)",
    zIndex: 50,
    boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.4), 0 -2px 8px rgba(0, 0, 0, 0.2)",
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
    marginBottom: "5px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "clamp(8px, 1.5vw, 16px)",
    maxHeight: "clamp(180px, 25vh, 280px)",
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    paddingRight: "12px",
    paddingBottom: "4px",
    minWidth: "100%",
  },
  galleryImageCard: {
    position: "relative" as const,
    aspectRatio: "16/9",
    overflow: "hidden",
    cursor: "pointer",
    border: "2px solid rgba(148, 163, 184, 0.25)",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
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
    textShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
  },
  imagePreviewOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#000",
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 0,
    opacity: 0,
    transform: "scale(0.9)",
    transition: "opacity 0.15s ease, transform 0.15s ease",
  },
  imagePreviewOverlayVisible: {
    opacity: 1,
    transform: "scale(1)",
  },
  previewImageContainer: {
    position: "relative" as const,
    width: "min(95vw, 1400px)",
    height: "min(95vh, 800px)",
    overflow: "hidden",
    borderRadius: "16px",
    border: "1px solid rgba(94, 234, 212, 0.3)",
    background: "linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))",
    boxShadow: "0 24px 80px -32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(94, 234, 212, 0.1), inset 0 0 40px rgba(94, 234, 212, 0.1)",
    backdropFilter: "blur(12px)",
    animation: "pulse 2s infinite",
  },
  previewImage: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain" as const,
    borderRadius: "8px",
  },
  previewHeader: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    padding: "20px 24px",
    background: "linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 70%, transparent 100%)",
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewTitle: {
    color: "rgba(248, 250, 252, 0.95)",
    fontSize: "1.2rem",
    fontWeight: 600,
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
    maxWidth: "80%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  previewCloseButton: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "rgba(254, 202, 202, 1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "1.2rem",
    fontWeight: "bold",
    transition: "all 0.2s ease",
    backdropFilter: "blur(4px)",
  },
  previewCloseButtonHover: {
    background: "rgba(239, 68, 68, 0.3)",
    transform: "scale(1.1)",
  },
  previewNavigation: {
    position: "absolute" as const,
    top: "50%",
    left: "20px",
    right: "20px",
    display: "flex",
    justifyContent: "space-between",
    transform: "translateY(-50%)",
    zIndex: 10,
  },
  previewNavButton: {
    background: "rgba(15, 23, 42, 0.5)",
    color: "rgba(248, 250, 252, 0.9)",
    border: "1px solid rgba(94, 234, 212, 0.3)",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "1.5rem",
    fontWeight: "bold",
    transition: "all 0.2s ease",
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  previewNavButtonHover: {
    background: "rgba(94, 234, 212, 0.2)",
    transform: "scale(1.1)",
    border: "1px solid rgba(94, 234, 212, 0.6)",
  },
  previewFooter: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: "20px 24px",
    background: "linear-gradient(to top, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 70%, transparent 100%)",
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewInfo: {
    color: "rgba(203, 213, 225, 0.9)",
    fontSize: "0.9rem",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
  },

};
export default function Home() {
  const deviceId = useDeviceId();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [adminImages, setAdminImages] = useState<Array<{ name: string; url: string }>>([]);
  const [selectedImage, setSelectedImage] = useState<{ name: string; url: string } | null>(null);
  const [wasPaused, setWasPaused] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isVideoOverlayMode, setIsVideoOverlayMode] = useState(false); // NEW: Track if overlay is for video
  const [fastRefreshTimer, setFastRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [videoVersion, setVideoVersion] = useState<number>(0);
  const previousVideoUrlRef = useRef<string | null>(null);
  const previousVideoBaseRef = useRef<string | null>(null);
  const previousVideoHashRef = useRef<string | null>(null);
  const previousIndexRef = useRef<number>(-1); // Initialize with -1 to detect first change

  const normalizeVideoUrl = (u: string | undefined | null) => {
    if (!u) return '';
    try {
      return String(u).split('?')[0].split('#')[0];
    } catch {
      return String(u);
    }
  };

  // Main slideshow controller
  const {
    currentIndex,
    isPaused,
    goToNext,
    goToPrevious,
    goToSlide,
    togglePause,
    pause: slideshowPause,
    play: slideshowPlay,
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

  // Ensure single video loops seamlessly
  useSingleVideoLoop(videoRef);

  // Keep webOS TV awake
  useKeepAwake(!isPaused);

  // Check orientation on mount and when it changes
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const warning = document.getElementById('landscape-warning');
      if (warning) {
        if (isLandscape) {
          warning.style.display = 'none';
        } else {
          warning.style.display = 'flex';
        }
      }
    };

    // Check initially
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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

  // Fetch admin images for gallery overlay
  const fetchAdminImages = useCallback(async () => {
    try {
      // Use gallery images API which returns all visible images (excluding dashboard.jpg)
      const cacheBuster = `?_t=${Date.now()}`;
      const response = await fetch(`/api/gallery-images${cacheBuster}`, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });



      if (!response.ok) {
        console.error('❌ Gallery images fetch failed:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data && data.images && Array.isArray(data.images)) {
        setAdminImages(data.images);
      } else {
        console.warn('⚠️ No images array in response');
        setAdminImages([]);
      }
    } catch (err) {
      console.error("❌ Error fetching gallery images:", err);
      setAdminImages([]);
    }
  }, []);

  // Fetch slides from API -- prefer admin-controlled `dashboard.mp4`.
  const fetchSlides = useCallback(async (isAutoRefresh = false) => {
    try {
      // Check the admin dashboard status endpoint first.
      const checkRes = await fetch(`/api/check-dashboard?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!checkRes.ok) {
        // If check fails, treat as missing dashboard to be safe
        console.warn('[fetchSlides] /api/check-dashboard returned error, treating as no dashboard');
        setSlides([]);
        setError(null);
        setLoading(true);
        return null;
      }

      const checkPayload: { exists: boolean; videoUrl?: string | undefined } = await checkRes.json();

      if (checkPayload.exists && checkPayload.videoUrl) {
        // Use the dashboard video as the single slide
        const durationSeconds = DEFAULT_SLIDE_DURATION_SECONDS;
        const dashboardSlide: Slide = {
          name: 'dashboard.mp4',
          url: checkPayload.videoUrl,
          durationSeconds,
          isVideo: true,
          videoUrl: checkPayload.videoUrl,
          videoHash: (checkPayload as any).videoHash ?? null,
          videoDurationSeconds: undefined,
        };

        setSlides([dashboardSlide]);
        setError(null);
        setLoading(false);
        return [dashboardSlide];
      }

      // If dashboard does not exist, clear slides and show loading state
      setSlides([]);
      setError(null);
      setLoading(true);
      return null;
    } catch (err) {
      console.error("❌ Error fetching slides:", err);
      if (!isAutoRefresh) {
        setError({ kind: "fetch", detail: err instanceof Error ? err.message : undefined });
      }
      return null;
    } finally {
      // Keep loading state as-is: we explicitly set loading when dashboard missing
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    console.log(`[Index] Device ID obtained: ${deviceId}`); // Log deviceId
    fetchSlides();
    fetchAdminImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]); // Add deviceId to dependencies to log when it's available

  // Monitor adminImages state changes
  useEffect(() => {
    if (adminImages.length > 0) {
    } else {
      // console.log('🖼️ Gallery state updated: empty');
    }
  }, [adminImages]);

  // Adjust currentIndex when slides array changes and handle video clearing
  useEffect(() => {
    if (slides.length > 0) {
      // If current index is out of bounds (e.g., when videos are removed/replaced), reset to 0
      if (currentIndex >= slides.length) {
        console.log(`⚠️ Current index ${currentIndex} out of bounds, resetting to 0`);
        goToSlide(0);
      }
    } else {
      // When no slides exist, clear the video element
      // When no slides exist, clear the video element
      const video = videoRef.current;
      if (video) {
        // Pause and clear without removing src
        video.pause();
        video.currentTime = 0;
      }
    }
  }, [slides.length, currentIndex, goToSlide, videoRef]); // Include videoRef dependency
  // Auto-refresh slides
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSlides(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Use ref-based fetch to prevent dependency issues

  // Language rotation
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LANGUAGE_SEQUENCE.length;
      setLanguage(LANGUAGE_SEQUENCE[index]);
    }, LANGUAGE_SWAP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleImageClick = useCallback((image: { name: string; url: string }) => {
    setSelectedImage(image);
    setIsOverlayVisible(true);
    setWasPaused(isPaused); // Remember current pause state
    slideshowPause(); // Pause slideshow when preview opens
  }, [isPaused, slideshowPause]);





  // Reset preload flag when slide changes
  useEffect(() => {
    resetPreloadFlag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]); // Remove resetPreloadFlag from deps to prevent infinite loop

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
          if (selectedImage) {
            handleClosePreview();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, slideshowPause]);

  const handleClosePreview = useCallback(() => {
    setIsOverlayVisible(false);
    setSelectedImage(null); // Remove immediately for faster response

    // Resume slideshow immediately without delay
    if (!wasPaused) {
      slideshowPlay(); // Resume if it was playing before - video will continue from where it paused
    }
  }, [wasPaused, slideshowPlay]);

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
          fetchSlides(true);
          fetchAdminImages(); // Also refresh admin images to stay in sync with remote page
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Additional listener specifically for video updates
  useEffect(() => {
    // Use a unique channel ID to avoid conflicts
    const channelName = `video-updates-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: 'video-updated' }, (payload: any) => {
        // Handle different video actions
        if (payload.action === 'deleted') {
          fetchSlides(true).then(() => {
          }).catch((err: any) => {
            console.error("❌ Failed to refresh slides after video deletion:", err);
          });
        } else {
          // Handle video creation/replacement
          // Clear any existing fast refresh timer
          if (fastRefreshTimer) {
            clearInterval(fastRefreshTimer);
            setFastRefreshTimer(null);
          }

          // Initial refresh
          fetchSlides(true).then(() => {
            // Set up fast refresh for the next 20 seconds (every 2 seconds)
            const timer = setInterval(() => {
              fetchSlides(true);
            }, FAST_REFRESH_INTERVAL_MS);

            setFastRefreshTimer(timer);

            // Stop fast refresh after 20 seconds
            setTimeout(() => {
              if (timer) {
                clearInterval(timer);
                setFastRefreshTimer(null);
              }
            }, 20_000);
          }).catch((err: any) => {
            console.error("❌ Failed to refresh slides after video update:", err);
          });
        }
      })
      .subscribe((status: any) => {
      });

    return () => {
      supabase.removeChannel(channel);

      // Clean up fast refresh timer
      if (fastRefreshTimer) {
        clearInterval(fastRefreshTimer);
        setFastRefreshTimer(null);
      }
    };
  }, [fastRefreshTimer, currentSlide?.name, fetchSlides]); // Include missing dependencies

  // Overlay mode state management
  useEffect(() => {
    if (!isOverlayVisible && !isVideoOverlayMode) {
      setIsVideoOverlayMode(false); // Reset overlay mode when closed
    }
  }, [isOverlayVisible, isVideoOverlayMode]);

  // Detect video URL changes and force reload
  useEffect(() => {
    const currentUrl = currentSlide?.videoUrl || null;
    const previousUrl = previousVideoUrlRef.current;

    if (currentUrl && currentUrl !== previousUrl) {
      // Increment version to trigger video reload with cache bust
      setVideoVersion(prev => prev + 1);
      previousVideoUrlRef.current = currentUrl;
    } else if (currentUrl !== previousUrl) {
      previousVideoUrlRef.current = currentUrl;

      // If URL became null, completely clear video element
      if (!currentUrl && previousUrl) {
        const video = videoRef.current;
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
      }
    }
  }, [currentSlide?.videoUrl, videoRef]); // Include videoRef dependency

  // Force play and reset ONLY when currentIndex actually changes (critical for webOS)
  useEffect(() => {
    const indexChanged = previousIndexRef.current !== currentIndex;

    if (indexChanged && currentSlide?.videoUrl) {
      previousIndexRef.current = currentIndex;

      const video = videoRef.current;
      if (video) {
        video.currentTime = 0; // Reset to start when slide changes
        if (!isPaused) {
          play(true).catch(e => console.error('Failed to play:', e));
        }
      }
    }
  }, [currentIndex, currentSlide, isPaused, play, videoRef]);

  // Additional listener for image metadata updates
  useEffect(() => {
    const channelName = `image-updates-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: 'image-updated' }, (payload) => {
        // When images are added, deleted, or metadata changes, refresh the gallery
        fetchAdminImages().catch(err => {
          console.error("❌ Failed to refresh gallery after image update:", err);
        });
      })
      .subscribe((status) => {
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAdminImages]);

  // Dashboard status checker - ensures main page mirrors admin page
  useEffect(() => {
    const checkDashboardStatus = async () => {
      try {
        const response = await fetch('/api/check-dashboard');
        const data = await response.json();

        const dashboardExists = data.exists;
        const currentHasVideo = slides.length > 0 && currentSlide?.videoUrl;

        // If admin has no dashboard but main page does, refresh main page
        if (!dashboardExists && currentHasVideo) {
          fetchSlides(true).then(() => {
          });
        }
        // If admin has dashboard but main page has no video, refresh
        else if (dashboardExists && !currentHasVideo) {
          fetchSlides(true).then(() => {
          });
        }
      } catch (error) {
        console.error("[Dashboard Status] Error checking dashboard status:", error);
      }
    };

    // Check immediately
    checkDashboardStatus();

    // Check every 10 seconds
    const interval = setInterval(checkDashboardStatus, 10000);

    // Also check when force-refresh is triggered
    const handleForceRefresh = () => {
      console.log("🔄 Force refresh detected, checking dashboard status...");
      setTimeout(checkDashboardStatus, 500); // Small delay to allow API to update
    };

    return () => {
      clearInterval(interval);
    };
  }, [slides.length, currentSlide?.videoUrl, fetchSlides]); // Include dependencies

  // Heartbeat polling for remote commands
  useHeartbeat(deviceId, useCallback((command: Command) => {
    const { type, data } = command;
    console.log(`⚡ [Index] Remote command received via Heartbeat: ${type} for device ${deviceId} with data:`, data);

    switch (type) {
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
        if (typeof data?.index === 'number') {
          console.log(`[Index] Command: goto index ${data.index}.`);
          goToSlide(data.index);
        }
        break;
      case 'show-image':
        if (data?.name && data?.url) {
          console.log(`[Index] Command: show-image "${data.name}".`);
          handleImageClick({ name: data.name, url: data.url });
        }
        break;
      case 'hide-image':
        console.log(`[Index] Command: hide-image.`);
        handleClosePreview();
        break;
      case 'refresh':
        console.log(`[Index] Command: refresh. Fetching slides and images.`);
        fetchSlides(true);
        fetchAdminImages();
        break;
      default:
        console.warn(`⚠️ [Index] Unknown remote command type: ${type}`);
        break;
    }
  }, [fetchAdminImages, fetchSlides, goToPrevious, goToNext, togglePause, goToSlide, handleImageClick, handleClosePreview]), isOverlayVisible ? selectedImage : null);

  // Log activeImage status being sent by useHeartbeat (triggered when dependencies change)
  useEffect(() => {
    console.log(`⬆️ [Index] Heartbeat sending activeImage status for ${deviceId}: ${isOverlayVisible ? selectedImage?.name || 'none' : 'none'}. isOverlayVisible: ${isOverlayVisible}`);
  }, [deviceId, isOverlayVisible, selectedImage]);

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
        <title>Slideshow</title>
        <style>{`
          /* Landscape orientation styles */
          html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          `}</style>
      </Head>

      {/* Device ID Display (Top Right) */}
      {showGallery && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: '8px 12px',
          borderRadius: '8px',
          color: 'rgba(248, 250, 252, 0.95)',
          fontSize: '1rem',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          DEVICE ID: {deviceId}
        </div>
      )}

      {/* Landscape Warning Overlay */}
      <div id="landscape-warning">
        <svg className="rotation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '10px' }}>Rotate Your Device</h2>
        <p style={{ color: '#fff', fontSize: '16px', marginBottom: '20px' }}>
          This display works only in landscape mode
        </p>
        <a href="#" className="skip-landscape" onClick={(e) => {
          e.preventDefault();
          document.getElementById('landscape-warning')!.style.display = 'none';
        }}>
          Continue Anyway
        </a>
      </div>

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
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.4);
            }
            70% {
              box-shadow: 0 0 0 12px rgba(94, 234, 212, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(94, 234, 212, 0);
            }
          }
          @keyframes zoomIn {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes zoomOut {
            from {
              opacity: 1;
              transform: scale(1);
            }
            to {
              opacity: 0;
              transform: scale(0.9);
            }
          }
          .preview-image-overlay {
            animation: zoomIn 0.15s ease-out forwards;
          }
          
          .preview-image-overlay.zoom-out {
            animation: zoomOut 0.15s ease-in forwards;
          }
          
          .preview-image-container {
            transition: all 0.3s ease;
          }
          
          .gallery-image-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          
          .gallery-image-card:hover {
            transform: scale(1.03);
            box-shadow: 0 0 20px rgba(94, 234, 212, 0.3);
          }
          
          .gallery-image-name {
            transition: opacity 0.3s ease;
          }
          
          .gallery-image-card:hover .gallery-image-name {
            opacity: 1;
          }
          .gallery-image-card {
            position: relative;
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
          }
          .gallery-grid::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(148, 163, 184, 0.5) 0%, rgba(148, 163, 184, 0.7) 100%);
            border: 2px solid rgba(15, 23, 42, 0.3);
          }
          .gallery-grid::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(148, 163, 184, 0.7) 0%, rgba(148, 163, 184, 0.9) 100%);
          }
          .gallery-grid::-webkit-scrollbar-corner {
            background: transparent;
          }
          
          /* Responsive image preview overlay */
          .preview-image-container {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .preview-image-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            object-position: center;
          }
          
          /* Ensure images maintain aspect ratio */
          @media (max-aspect-ratio: 4/3) {
            .preview-image-container img {
              height: 100%;
              width: auto;
            }
          }
          
          @media (min-aspect-ratio: 3/4) {
            .preview-image-container img {
              width: 100%;
              height: auto;
            }
          }
          
          @media (max-width: 768px) {
            .preview-image-overlay {
              padding: 8px !important;
            }
            .preview-image-container {
              width: 98vw !important;
              height: 85vh !important;
            }
          }
          
          @media (max-width: 480px) {
            .preview-image-overlay {
              padding: 4px !important;
            }
            .preview-image-container {
              width: 100vw !important;
              height: 100vh !important;
              border: none !important;
              background: rgba(0, 0, 0, 0.95) !important;
            }
          }
          
          @media (max-width: 360px) {
            .preview-image-overlay {
              padding: 2px !important;
            }
            .preview-image-container {
              width: 100vw !important;
              height: 100vh !important;
            }
          }
          
          @media (orientation: landscape) and (max-height: 500px) {
            .preview-image-container {
              height: 95vh !important;
              width: auto !important;
              max-width: 90vw !important;
            }
          }
          
          @media (orientation: landscape) and (max-height: 400px) {
            .preview-image-container {
              height: 98vh !important;
            }
          }
          
          /* Responsive Gallery Grid for 16:9 Images */
          .gallery-grid {
            min-width: 100%;
            width: 100%;
          }
          
          @media (max-width: 1400px) {
            .gallery-grid {
              grid-template-columns: repeat(8, 1fr);
            }
          }
          
          @media (max-width: 1200px) {
            .gallery-grid {
              grid-template-columns: repeat(7, 1fr);
            }
          }
          
          @media (max-width: 1024px) {
            .gallery-grid {
              grid-template-columns: repeat(6, 1fr);
              gap: clamp(6px, 1.2vw, 12px);
            }
          }
          
          @media (max-width: 900px) {
            .gallery-grid {
              grid-template-columns: repeat(5, 1fr);
              gap: clamp(6px, 1vw, 10px);
            }
          }
          
          @media (max-width: 768px) {
            .gallery-grid {
              grid-template-columns: repeat(4, 1fr);
              gap: clamp(4px, 0.8vw, 8px);
            }
          }
          
          @media (max-width: 600px) {
            .gallery-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: clamp(4px, 0.6vw, 6px);
            }
          }
          
          @media (max-width: 480px) {
            .gallery-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: clamp(3px, 0.5vw, 4px);
            }
          }
          
          @media (max-width: 360px) {
            .gallery-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 2px;
            }
          }
          
          /* Ensure 16:9 aspect ratio is maintained */
          .gallery-image-card {
            aspect-ratio: 16/9;
            width: 100%;
            min-width: 0;
          }
          
          .gallery-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
          }
          
          /* Hide scrollbar for cleaner look */
          .gallery-grid::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }
          
          .gallery-grid::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          
          .gallery-grid::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.5);
          }
          
          .gallery-grid::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.7);
          }
          
          /* Force 16:9 aspect ratio */
          [style*="aspect-ratio: 16/9"] {
            aspect-ratio: 16/9 !important;
          }
          
          /* Better touch targets on mobile */
          @media (max-width: 768px) {
            .gallery-grid {
              max-height: 35vh !important;
              padding-bottom: 8px !important;
            }
          }
          
          @media (max-width: 480px) {
            .gallery-grid {
              max-height: 40vh !important;
              padding: 8px 4px 12px 8px !important;
            }
          }
          
          /* Ensure images load smoothly */
          .gallery-image {
            opacity: 1;
          }
          
          /* Landscape orientation enforcement */
          @media (orientation: portrait) {
            body {
              margin: 0;
              padding: 0;
            }
            
            #landscape-warning {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: #000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              text-align: center;
            }
            
            .rotation-icon {
              width: 80px;
              height: 80px;
              margin-bottom: 20px;
              animation: rotate-device 2s ease-in-out infinite;
            }
            
            @keyframes rotate-device {
              0%, 90% { transform: rotate(0deg); }
              25% { transform: rotate(-90deg); }
              75% { transform: rotate(-90deg); }
              100% { transform: rotate(0deg); }
            }
            
            .skip-landscape {
              position: absolute;
              bottom: 40px;
              padding: 12px 24px;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: white;
              text-decoration: none;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            
            .skip-landscape:hover {
              background: rgba(255, 255, 255, 0.2);
            }
          }
          
          @media (orientation: landscape) {
            #landscape-warning {
              display: none !important;
            }
          }
          
          /* Smooth transitions for all interactive elements */
          * {
            transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          }
        `}</style>
      </Head>
      <main style={styles.container}>

        <div style={styles.imageWrapper}>
          {slides.length > 0 && currentSlide && currentSlide.videoUrl ? (
            <video
              ref={videoRef}
              src={`${currentSlide.videoUrl}?v=${videoVersion}`}
              autoPlay
              muted
              playsInline
              loop={slides.length <= 1 || currentSlide?.videoDurationSeconds !== null}
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

                // If the video fails to load, treat it as deleted
                if (error && (error.code === 4 || error.code === 2)) {
                  console.log(`📹 Video failed to load, assuming deleted - clearing video`);
                  // Force refresh slides to remove the deleted video
                  fetchSlides(true).then(() => {
                    console.log("✅ Slides refreshed after video load error");
                  });
                }
              }}
            />
          ) : (
            <div style={styles.placeholderCard}>
              <div style={styles.glow} />
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
          )}
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
          <div
            className="preview-image-overlay"
            style={{
              ...styles.imagePreviewOverlay,
              ...(isOverlayVisible ? styles.imagePreviewOverlayVisible : {})
            }}
            onClick={handleClosePreview}
            onAnimationEnd={(e) => {
              // Reset animation state when animation completes
              if (!isOverlayVisible) {
                e.currentTarget.style.animation = 'none';
              }
            }}
          >
            <button
              onClick={handleClosePreview}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 201,
              }}
            >
              &times;
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </main>
    </>
  );
}