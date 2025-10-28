import { useEffect, useMemo, useState, type CSSProperties } from "react";

const SLIDE_DURATION_MS = 10_000;

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
      <img
        key={activeSlide?.name ?? "placeholder"}
        src={activeSlide?.url}
        alt={activeSlide?.name ?? "Slide"}
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
