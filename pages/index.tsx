import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const SLIDE_DURATION_MS = 12_000;
const KEEP_ALIVE_INTERVAL_MS = 30_000;
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

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
  removeEventListener?: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

type FetchState = "loading" | "ready" | "error";

const FALLBACK_SLIDE: Slide | null = null;

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#000"
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    backgroundColor: "#000"
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

function areSlidesEqual(previous: Slide[], next: Slide[]): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    if (previous[index]?.name !== next[index]?.name) {
      return false;
    }
  }

  return true;
}
const getErrorMessage = (appError: AppError, language: Language) => {
  const base =
    appError.kind === "fetch"
      ? translations.fetchError[language]
      : translations.unknownError[language];
  return appError.detail ? `${base} (${appError.detail})` : base;
};

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [displayedSlide, setDisplayedSlide] = useState<Slide | null>(FALLBACK_SLIDE);
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [language, setLanguage] = useState<Language>("en");
  const preloadedUrlsRef = useRef<Set<string>>(new Set());
  const slidesSnapshotRef = useRef<Slide[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const queuePreload = (url: string) => {
    if (!url || typeof window === "undefined") {
      return;
    }

    if (preloadedUrlsRef.current.has(url)) {
      return;
    }

    const image = new window.Image();
    image.decoding = "async";
    image.src = url;
    const finalize = () => {
      preloadedUrlsRef.current.add(url);
    };
    image.onload = finalize;
    image.onerror = finalize;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let nextIndex = 0;
    const intervalId = window.setInterval(() => {
      nextIndex = (nextIndex + 1) % LANGUAGE_SEQUENCE.length;
      setLanguage(LANGUAGE_SEQUENCE[nextIndex]);
    }, LANGUAGE_SWAP_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    slidesSnapshotRef.current = slides;
  }, [slides]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchSlides = async () => {
      try {
        setFetchState("loading");
        const response = await fetch("/api/images", {
          signal: controller.signal,
          cache: "no-store"
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

        if (isMounted) {
          const nextSlides = payload.images.map((filename) => ({
            name: filename,
            url: `/api/image/${encodeURIComponent(filename)}`,
            duration: imageDurations[filename] || SLIDE_DURATION_MS,
          }));
          const hasChanged = !areSlidesEqual(slidesSnapshotRef.current, nextSlides);
          if (hasChanged) {
            slidesSnapshotRef.current = nextSlides;
            setSlides(nextSlides);
            setActiveIndex(0);
            setDisplayedSlide(nextSlides[0] ?? FALLBACK_SLIDE);
          }
          setRefreshKey(0);
          setError(null);
          setFetchState("ready");
        }
      } catch (err) {
        if (isMounted) {
          const detail = err instanceof Error ? err.message : undefined;
          setError({ kind: "fetch", detail });
          setFetchState("error");
        }
      }
    };

    void fetchSlides();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  const currentSlide = useMemo(
    () => (slides.length ? slides[activeIndex % slides.length] ?? null : null),
    [slides, activeIndex]
  );

  useEffect(() => {
    if (slides.length <= 1 || !currentSlide) {
      return;
    }

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % slides.length;
      if (nextIndex === 0) {
        setRefreshKey(k => k + 1);
      }
      setActiveIndex(nextIndex);
    }, currentSlide.duration);

    return () => {
      clearInterval(timer);
    };
  }, [currentSlide, slides.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!currentSlide) {
      return;
    }

    if (displayedSlide?.url === currentSlide.url) {
      return;
    }

    let isCancelled = false;
    const preloader = new window.Image();
    preloader.decoding = "async";
    preloader.loading = "eager";
    preloader.src = currentSlide.url;

    const finalize = () => {
      if (!isCancelled) {
        preloadedUrlsRef.current.add(currentSlide.url);
        setDisplayedSlide(currentSlide);
      }
    };

    preloader.onload = finalize;
    preloader.onerror = finalize;

    return () => {
      isCancelled = true;
    };
  }, [currentSlide, displayedSlide]);

  useEffect(() => {
    if (!slides.length) {
      return;
    }

    for (let i = 1; i <= 3; i += 1) {
      const nextIndex = (activeIndex + i) % slides.length;
      if (nextIndex === activeIndex) {
        continue;
      }
      const nextSlide = slides[nextIndex];
      if (!nextSlide) {
        continue;
      }
      queuePreload(nextSlide.url);
    }
  }, [activeIndex, slides]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const nav = navigator as WakeLockNavigator;
    const wakeLockAPI = nav.wakeLock;

    if (!wakeLockAPI) {
      return;
    }

    let releasedByComponent = false;

    const requestWakeLock = async () => {
      try {
        const sentinel = await wakeLockAPI.request("screen");
        wakeLockRef.current?.removeEventListener?.("release", handleRelease);
        wakeLockRef.current = sentinel;
        wakeLockRef.current.addEventListener?.("release", handleRelease);
      } catch (err) {
        console.warn("Gagal mengaktifkan screen wake lock:", err);
      }
    };

    const handleRelease = () => {
      wakeLockRef.current = null;
      if (!releasedByComponent && document.visibilityState === "visible") {
        void requestWakeLock();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      } else {
        releasedByComponent = true;
        void wakeLockRef.current?.release();
        releasedByComponent = false;
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      releasedByComponent = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLockRef.current?.removeEventListener?.("release", handleRelease);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const emitSyntheticMovement = () => {
      const target = document.body ?? document.documentElement;
      if (!target) {
        return;
      }

      const now = Date.now();
      const event = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: false,
        clientX: (now % window.innerWidth) || 1,
        clientY: (now % window.innerHeight) || 1,
        movementX: 1,
        movementY: 1,
        screenX: 0,
        screenY: 0
      });

      target.dispatchEvent(event);
    };

    const intervalId = window.setInterval(emitSyntheticMovement, KEEP_ALIVE_INTERVAL_MS);
    emitSyntheticMovement();

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  if (fetchState === "loading" && !displayedSlide) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>{translations.loading[language]}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>{getErrorMessage(error, language)}</p>
      </main>
    );
  }

  if (slides.length === 0) {
    return (
      <main style={styles.container}>
        <p style={{ ...styles.message, ...styles.noSlidesMessage }}>
          {translations.noSlides[language]}
        </p>
      </main>
    );
  }

  return (
    <main style={styles.container}>

      <img
        src={displayedSlide?.url ?? ""}
        alt={displayedSlide?.name ?? "Slide"}
        decoding="async"
        loading="eager"
        style={styles.image}
      />
    </main>
  );
}
