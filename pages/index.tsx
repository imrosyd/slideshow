import { useEffect, useRef, useState, type CSSProperties } from "react";

const SLIDE_DURATION_MS = 30_000;

type Slide = {
  name: string;
  url: string;
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

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedSlide, setDisplayedSlide] = useState<Slide | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSlides = async () => {
      try {
        const response = await fetch("/api/images");
        if (!response.ok) {
          throw new Error(`Gagal memuat daftar gambar: ${response.statusText}`);
        }
        const payload: { images: string[] } = await response.json();
        if (isMounted) {
          const nextSlides = payload.images.map((filename) => ({
            name: filename,
            url: `/api/image/${encodeURIComponent(filename)}`
          }));
          setSlides(nextSlides);
          setActiveIndex(0);
          setDisplayedSlide(nextSlides[0] ?? null);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, SLIDE_DURATION_MS);

    return () => {
      clearInterval(timer);
    };
  }, [slides]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!slides.length) {
      return;
    }

    const targetSlide = slides[activeIndex];
    if (!targetSlide) {
      return;
    }

    if (displayedSlide?.url === targetSlide.url) {
      return;
    }

    let isCancelled = false;
    const preloader = new window.Image();
    preloader.src = targetSlide.url;

    preloader.onload = () => {
      if (!isCancelled) {
        setDisplayedSlide(targetSlide);
      }
    };

    preloader.onerror = () => {
      if (!isCancelled) {
        setDisplayedSlide(targetSlide);
      }
    };

    return () => {
      isCancelled = true;
    };
  }, [slides, activeIndex, displayedSlide]);

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

  if (isLoading) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>Memuat gambar…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>{error}</p>
      </main>
    );
  }

  if (slides.length === 0) {
    return (
      <main style={styles.container}>
        <p style={styles.message}>Belum ada gambar di folder root proyek.</p>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <img
        key={displayedSlide?.name ?? "placeholder"}
        src={displayedSlide?.url}
        alt={displayedSlide?.name ?? "Slide"}
        style={styles.image}
      />
    </main>
  );
}

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
    fontSize: "1.1rem",
    textAlign: "center",
    maxWidth: "30rem",
    lineHeight: 1.6,
    color: "#e2e8f0"
  }
};
