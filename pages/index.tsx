import { useEffect, useState, type CSSProperties } from "react";

const SLIDE_DURATION_MS = 12_000;
const LANGUAGE_SWAP_INTERVAL_MS = 1_000;
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
    id: "Belum ada dashboard yang di tampilkan.",
  },
  fetchError: {
    en: "Unable to load images. Please try refreshing the display.",
    ko: "이미지를 불러올 수 없습니다. 화면을 새로 고침해 보세요.",
    id: "Tidak dapat memuat gambar. Coba segarkan tampilan.",
  },
  unknownError: {
    en: "An unexpected error occurred.",
    ko: "알 수 없는 오류가 발생했습니다.",
    id: "Terjadi kesalahan yang tidak terduga.",
  },
} as const;

type AppError =
  | { kind: "fetch"; detail?: string }
  | { kind: "unknown"; detail?: string };

type Slide = {
  name: string;
  url: string;
  duration: number;
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden"
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
    backgroundColor: "#000",
    imageRendering: "high-quality" as any,
  },
  message: {
    fontSize: "1.5rem",
    textAlign: "center",
    maxWidth: "30rem",
    lineHeight: 1.6,
    color: "#e2e8f0"
  },
  noSlidesMessage: {
    fontSize: "1.5rem",
    letterSpacing: "-0.01em"
  }
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

  // Fetch slides from API (reusable function)
  const fetchSlides = async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      }
      
      // Fetch image list
      const response = await fetch("/api/images", { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load image list: ${response.statusText}`);
      }
      const payload: { images: string[] } = await response.json();

      // Fetch durations
      const configResponse = await fetch("/api/config");
      let imageDurations: Record<string, number> = {};
      if (configResponse.ok) {
        imageDurations = await configResponse.json();
      }

      const fetchedSlides = payload.images.map((filename) => ({
        name: filename,
        url: `/api/image/${encodeURIComponent(filename)}`,
        duration: imageDurations[filename] || SLIDE_DURATION_MS,
      }));

      // Check if slides have changed
      const slidesChanged = 
        slides.length !== fetchedSlides.length ||
        !slides.every((slide, index) => slide.name === fetchedSlides[index]?.name);

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
        
        // Only reset index if new slides list is different
        if (isAutoRefresh) {
          // If current index is out of bounds, reset to 0
          if (currentIndex >= fetchedSlides.length) {
            setCurrentIndex(0);
          }
        } else {
          setCurrentIndex(0);
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
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchSlides(false);
  }, []);

  // Auto-refresh: Check for new images periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 Checking for new images...');
      fetchSlides(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [slides, currentIndex]); // Re-create interval when slides change

  // Auto-rotate slides with smooth fade
  useEffect(() => {
    if (slides.length <= 1) {
      console.log(`⏸️ Not rotating: ${slides.length} slide(s)`);
      return;
    }

    const currentSlide = slides[currentIndex];
    if (!currentSlide) return;

    console.log(`⏱️ Timer set for ${currentSlide.duration}ms (slide ${currentIndex + 1}/${slides.length}: ${currentSlide.name})`);

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
    }, currentSlide.duration);

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

  // Loading state
  if (loading) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>{translations.loading[language]}</p>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>{getErrorMessage(error, language)}</p>
      </main>
    );
  }

  // No slides
  if (slides.length === 0) {
    return (
      <main style={styles.container}>
        <p style={{ ...styles.message, ...styles.noSlidesMessage }}>
          {translations.noSlides[language]}
        </p>
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
