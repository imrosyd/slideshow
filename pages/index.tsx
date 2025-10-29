import { useEffect, useState, type CSSProperties } from "react";

const SLIDE_DURATION_MS = 12_000;
const LANGUAGE_SWAP_INTERVAL_MS = 1_000;

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
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    backgroundColor: "#000",
    imageRendering: "crisp-edges" as const,
    WebkitFontSmoothing: "none" as const,
    position: "absolute",
    top: 0,
    left: 0,
    transition: "opacity 0.8s ease-in-out",
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
  const [nextIndex, setNextIndex] = useState(1);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [currentImageLoaded, setCurrentImageLoaded] = useState(false);
  const [nextImageLoaded, setNextImageLoaded] = useState(false);
  const [showCurrent, setShowCurrent] = useState(true);

  // Fetch slides from API
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        setLoading(true);
        
        // Fetch image list
        const response = await fetch("/api/images", { cache: "no-store" });
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

        console.log(`✅ Fetched ${fetchedSlides.length} slides:`, fetchedSlides);
        
        setSlides(fetchedSlides);
        setCurrentIndex(0);
        setNextIndex(fetchedSlides.length > 1 ? 1 : 0);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching slides:", err);
        const detail = err instanceof Error ? err.message : undefined;
        setError({ kind: "fetch", detail });
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, []);

  // Auto-rotate slides with preloading
  useEffect(() => {
    if (slides.length <= 1) {
      console.log(`⏸️ Not rotating: ${slides.length} slide(s)`);
      return;
    }

    const currentSlide = slides[currentIndex];
    if (!currentSlide) return;

    // Only start timer when next image is loaded
    if (!nextImageLoaded) {
      console.log(`⏳ Waiting for next image to load...`);
      return;
    }

    console.log(`⏱️ Timer set for ${currentSlide.duration}ms (slide ${currentIndex + 1}/${slides.length}: ${currentSlide.name})`);

    const timer = setTimeout(() => {
      const newNextIndex = (currentIndex + 2) % slides.length;
      console.log(`➡️ Transitioning to slide ${nextIndex + 1}/${slides.length}`);
      
      // Fade transition
      setShowCurrent(false);
      
      // After fade, update indices
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setNextIndex(newNextIndex);
        setShowCurrent(true);
        setNextImageLoaded(false); // Reset for next preload
      }, 800); // Match transition duration
      
    }, currentSlide.duration);

    return () => {
      clearTimeout(timer);
    };
  }, [slides, currentIndex, nextIndex, nextImageLoaded]);

  // Rotate language
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LANGUAGE_SEQUENCE.length;
      setLanguage(LANGUAGE_SEQUENCE[index]);
    }, LANGUAGE_SWAP_INTERVAL_MS);

    return () => clearInterval(interval);
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
  const nextSlide = slides[nextIndex];

  return (
    <main style={styles.container}>
      {/* Current visible image */}
      {currentSlide && (
        <img
          src={currentSlide.url}
          alt={currentSlide.name}
          style={{
            ...styles.image,
            opacity: showCurrent ? 1 : 0,
            zIndex: showCurrent ? 2 : 1,
          }}
          loading="eager"
          decoding="sync"
          onLoad={() => {
            setCurrentImageLoaded(true);
            console.log(`🖼️ Current loaded: ${currentSlide.name}`);
          }}
          onError={(e) => console.error(`❌ Failed to load: ${currentSlide.name}`, e)}
        />
      )}
      
      {/* Next image (preloading in background) */}
      {nextSlide && slides.length > 1 && (
        <img
          src={nextSlide.url}
          alt={nextSlide.name}
          style={{
            ...styles.image,
            opacity: showCurrent ? 0 : 1,
            zIndex: showCurrent ? 1 : 2,
          }}
          loading="eager"
          decoding="sync"
          onLoad={() => {
            setNextImageLoaded(true);
            console.log(`� Next preloaded: ${nextSlide.name}`);
          }}
          onError={(e) => console.error(`❌ Failed to preload: ${nextSlide.name}`, e)}
        />
      )}
    </main>
  );
}
