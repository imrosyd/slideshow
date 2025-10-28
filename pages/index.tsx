import { useEffect, useMemo, useState, type CSSProperties } from "react";

const SLIDE_DURATION_MS = 60_000;

type Slide = {
  name: string;
  url: string;
};

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const activeSlide = useMemo(() => slides[activeIndex], [slides, activeIndex]);

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
      <figure style={styles.figure}>
        <img
          key={activeSlide?.name ?? "placeholder"}
          src={activeSlide?.url}
          alt={activeSlide?.name ?? "Slide"}
          style={styles.image}
        />
        <figcaption style={styles.caption}>{activeSlide?.name}</figcaption>
      </figure>
      <div style={styles.progressWrapper}>
        <div
          style={{
            ...styles.progressBar,
            animationDuration: `${SLIDE_DURATION_MS}ms`
          }}
          key={activeSlide?.name}
        />
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    padding: "2rem",
    gap: "1rem"
  },
  figure: {
    maxWidth: "90vw",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    padding: "1.5rem",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.7)"
  },
  image: {
    maxWidth: "100%",
    maxHeight: "70vh",
    objectFit: "contain",
    borderRadius: "0.5rem",
    background: "#020617"
  },
  caption: {
    fontSize: "1rem",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#cbd5f5"
  },
  message: {
    fontSize: "1.1rem",
    textAlign: "center",
    maxWidth: "30rem",
    lineHeight: 1.6,
    color: "#e2e8f0"
  },
  progressWrapper: {
    width: "min(600px, 80vw)",
    height: "6px",
    background: "rgba(148, 163, 184, 0.2)",
    borderRadius: "999px",
    overflow: "hidden"
  },
  progressBar: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(90deg, #38bdf8, #818cf8)",
    transformOrigin: "left",
    animationName: "progress",
    animationDuration: `${SLIDE_DURATION_MS}ms`,
    animationTimingFunction: "linear",
    animationIterationCount: 1
  }
};
