import { useState, useEffect, useRef, type FormEvent, type CSSProperties, type DragEvent, type ChangeEvent } from "react";

type Theme = 'light' | 'dark' | 'system';

const DEFAULT_SLIDE_DURATION_MS = 12_000; // Default duration for slides in milliseconds (12 seconds)
const MS_PER_SECOND = 1000;

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.style.setProperty('--bg-color', '#0b1529');
    root.style.setProperty('--surface-color', '#111f3c');
    root.style.setProperty('--section-color', '#162748');
    root.style.setProperty('--text-color', '#f1f5ff');
    root.style.setProperty('--muted-text', '#97a3bf');
    root.style.setProperty('--secondary-text', '#7281a3');
    root.style.setProperty('--secondary-color', '#7281a3');
    root.style.setProperty('--primary-color', '#4f6ff5');
    root.style.setProperty('--primary-accent', '#7d8bff');
    root.style.setProperty('--border-color', 'rgba(83, 104, 173, 0.35)');
    root.style.setProperty('--divider-color', 'rgba(83, 104, 173, 0.22)');
    root.style.setProperty('--input-bg', '#14233f');
    root.style.setProperty('--input-text', '#f1f5ff');
    root.style.setProperty('--input-border-strong', 'rgba(115, 138, 202, 0.42)');
    root.style.setProperty('--shadow-color', 'rgba(9, 16, 32, 0.6)');
    root.style.setProperty('--button-text', '#f8faff');
    root.style.setProperty('--danger-color', '#f87171');
    root.style.setProperty('--danger-hover', '#ef4444');
    root.style.setProperty('--accent-chip', 'rgba(120, 140, 220, 0.12)');
  } else {
    root.style.setProperty('--bg-color', '#f5f7fb');
    root.style.setProperty('--surface-color', '#ffffff');
    root.style.setProperty('--section-color', '#f9fafc');
    root.style.setProperty('--text-color', '#121621');
    root.style.setProperty('--muted-text', '#6c7385');
    root.style.setProperty('--secondary-text', '#8f96a9');
    root.style.setProperty('--secondary-color', '#8f96a9');
    root.style.setProperty('--primary-color', '#3c55e7');
    root.style.setProperty('--primary-accent', '#6576ff');
    root.style.setProperty('--border-color', 'rgba(69, 94, 178, 0.18)');
    root.style.setProperty('--divider-color', 'rgba(69, 94, 178, 0.12)');
    root.style.setProperty('--input-bg', '#ffffff');
    root.style.setProperty('--input-text', '#121621');
    root.style.setProperty('--input-border-strong', 'rgba(69, 94, 178, 0.25)');
    root.style.setProperty('--shadow-color', 'rgba(33, 56, 106, 0.12)');
    root.style.setProperty('--button-text', '#ffffff');
    root.style.setProperty('--danger-color', '#e54848');
    root.style.setProperty('--danger-hover', '#c53030');
    root.style.setProperty('--accent-chip', 'rgba(60, 85, 231, 0.08)');
  }
};

const styles: Record<string, CSSProperties> = {
  fullPageContainer: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px clamp(24px, 8vw, 108px)',
    transition: 'background-color 0.4s ease',
    boxSizing: 'border-box',
  },
  surface: {
    width: '100%',
    maxWidth: 'min(1120px, 92vw)',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    backgroundColor: 'var(--surface-color)',
    borderRadius: '28px',
    padding: 'clamp(36px, 5vw, 56px)',
    boxShadow: '0 32px 80px -40px var(--shadow-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-color)',
    transition: 'background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '24px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '520px',
  },
  title: {
    color: 'var(--text-color)',
    margin: 0,
    fontSize: '2.4rem',
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: 'var(--secondary-text)',
    margin: 0,
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  themeToggleButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    height: '46px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    backgroundColor: 'var(--section-color)',
    color: 'var(--text-color)',
    cursor: 'pointer',
    fontSize: '1.2rem',
    fontWeight: 600,
    transition: 'background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
    boxShadow: '0 16px 30px -28px var(--shadow-color)',
    borderRadius: '12px',
  },
  themeToggleIcon: {
    fontSize: '1.2rem',
    lineHeight: 1,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '26px clamp(20px, 4vw, 32px)',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--section-color)',
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
    boxShadow: '0 22px 48px -32px var(--shadow-color)',
  },
  sectionHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '1.35rem',
    fontWeight: 600,
    margin: 0,
    color: 'var(--text-color)',
  },
  sectionSubtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: 'var(--secondary-color)',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    width: '100%',
    maxWidth: '320px',
  },
  passwordInput: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--input-border-strong)',
    borderRadius: '12px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--input-text)',
    fontSize: '1rem',
    padding: '12px 16px',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
    outline: 'none',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '12px 22px',
    borderRadius: '12px',
    border: '1px solid transparent',
    backgroundImage: 'linear-gradient(135deg, var(--primary-color), var(--primary-accent))',
    color: 'var(--button-text)',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 18px 36px -26px var(--shadow-color)',
  },
  buttonDisabled: {
    backgroundImage: 'none',
    backgroundColor: 'var(--secondary-color)',
    borderColor: 'transparent',
    cursor: 'not-allowed',
    opacity: 0.6,
    transform: 'none',
    boxShadow: 'none',
  },
  buttonDelete: {
    backgroundImage: 'linear-gradient(135deg, var(--danger-color), var(--danger-hover))',
    color: '#ffffff',
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '420px',
  },
  dropZone: {
    borderWidth: '1.5px',
    borderStyle: 'dashed',
    borderColor: 'var(--border-color)',
    borderRadius: '16px',
    backgroundColor: 'var(--section-color)',
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    textAlign: 'center',
    transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
    boxShadow: '0 14px 30px -24px var(--shadow-color)',
  },
  dropZoneActive: {
    borderColor: 'var(--primary-color)',
    backgroundColor: 'rgba(79, 111, 245, 0.08)',
    boxShadow: '0 20px 36px -25px var(--shadow-color)',
  },
  dropZoneIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--accent-chip)',
    color: 'var(--primary-color)',
    fontSize: '1.4rem',
  },
  dropZoneHeadline: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 600,
    color: 'var(--text-color)',
  },
  dropZoneCaption: {
    margin: 0,
    fontSize: '0.9rem',
    color: 'var(--secondary-text)',
  },
  dropZoneMeta: {
    margin: 0,
    fontSize: '0.85rem',
    color: 'var(--muted-text)',
  },
  fileList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
  },
  fileListItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '18px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    backgroundColor: 'var(--section-color)',
    boxShadow: '0 18px 40px -30px var(--shadow-color)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    borderRadius: '16px',
  },
  fileInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  fileMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexGrow: 1,
  },
  fileNameText: {
    wordBreak: 'break-word',
    fontSize: '0.95rem',
    lineHeight: 1.4,
    color: 'var(--text-color)',
  },
  imagePreview: {
    width: '72px',
    height: '72px',
    objectFit: 'cover',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-color)',
    flexShrink: 0,
    borderRadius: '16px',
  },
  durationControl: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--divider-color)',
  },
  durationLabel: {
    color: 'var(--secondary-text)',
    fontSize: '0.9rem',
  },
  durationInput: {
    width: '72px',
    padding: '10px 12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--input-border-strong)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--input-text)',
    textAlign: 'center',
    fontSize: '0.9rem',
    outline: 'none',
    borderRadius: '12px',
  },
  emptyState: {
    padding: '28px 24px',
    borderRadius: '18px',
    border: '1px dashed var(--divider-color)',
    backgroundColor: 'var(--section-color)',
    color: 'var(--muted-text)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    textAlign: 'center',
  },
  error: {
    padding: '12px 18px',
    borderRadius: '10px',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    color: 'var(--error-color)',
    fontSize: '0.92rem',
    fontWeight: 500,
    border: '1px solid rgba(248, 113, 113, 0.2)',
  },
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');

  // Read theme preference from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as Theme;
      if (storedTheme) {
        setCurrentTheme(storedTheme);
      }
    }
  }, []);

  const [images, setImages] = useState<string[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [imageDurations, setImageDurations] = useState<Record<string, number>>({});

  const [resolvedThemeIcon, setResolvedThemeIcon] = useState<string>('');
  const [resolvedThemeName, setResolvedThemeName] = useState<'light' | 'dark'>('light');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Apply theme on mount and when currentTheme changes
  useEffect(() => {
    const resolvedTheme = currentTheme === 'system' ? getSystemTheme() : currentTheme;
    applyTheme(resolvedTheme);

    // Set the icon based on the resolved theme for client-side rendering
    if (resolvedTheme === 'light') {
      setResolvedThemeIcon('☀️');
      setResolvedThemeName('light');
    } else {
      setResolvedThemeIcon('🌙');
      setResolvedThemeName('dark');
    }
  }, [currentTheme]);

  // Listen for system theme changes if currentTheme is 'system'
  useEffect(() => {
    if (currentTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme(getSystemTheme());
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [currentTheme]);

  // Save theme preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', currentTheme);
    }
  }, [currentTheme]);

  const fetchImagesAndConfig = async () => {
    try {
      // Fetch images
      const imagesResponse = await fetch("/api/images");
      if (!imagesResponse.ok) throw new Error("Failed to load images.");
      const imagesData = await imagesResponse.json();
      setImages(imagesData.images || []);
      setSelectedImages(new Set()); // Clear selection after refresh

      // Fetch config (durations)
      const configResponse = await fetch("/api/config", {
        headers: {
          "Authorization": `Bearer ${password}`,
        },
      });
      if (!configResponse.ok) throw new Error("Failed to load duration settings.");
      const configData = await configResponse.json();
      setImageDurations(configData || {});

    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void fetchImagesAndConfig();
    }
  }, [isAuthenticated, password]); // Depend on password to ensure auth header is available

  const performLogin = async (pwd: string, options?: { silent?: boolean; remember?: boolean }) => {
    const { silent = false, remember = true } = options ?? {};
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || "Incorrect password.");
      }

      setPassword(pwd);
      setIsAuthenticated(true);
      if (remember && typeof window !== 'undefined') {
        window.sessionStorage.setItem('adminPassword', pwd);
      }
      return true;
    } catch (err: any) {
      if (!silent) {
        setError(err.message);
      }
      setIsAuthenticated(false);
      if (remember && typeof window !== 'undefined') {
        window.sessionStorage.removeItem('adminPassword');
      }
      return false;
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    void performLogin(password, { silent: false, remember: true });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedPassword = window.sessionStorage.getItem('adminPassword');
    if (storedPassword) {
      setPassword(storedPassword);
      void performLogin(storedPassword, { silent: true, remember: true });
    }
  }, []);

  const handleToggleSelect = (filename: string) => {
    setSelectedImages((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(filename)) {
        newSelection.delete(filename);
      } else {
        newSelection.add(filename);
      }
      return newSelection;
    });
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (fileList && fileList.length > 0) {
      setFilesToUpload(fileList);
      setError(null);
    } else {
      setFilesToUpload(null);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const currentTarget = event.currentTarget as Node;
    const relatedTarget = event.relatedTarget as Node | null;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const droppedFiles = event.dataTransfer?.files ?? null;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(event.target.files);
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) {
      setError("Select at least one image to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedImages.size} selected images?`)) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`,
        },
        body: JSON.stringify({ filenames: Array.from(selectedImages) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete files.");
      await fetchImagesAndConfig(); // Refresh list and config
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!filesToUpload || filesToUpload.length === 0) {
      setError("Select at least one file to upload.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    for (let i = 0; i < filesToUpload.length; i++) {
      formData.append("file", filesToUpload[i]);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${password}`,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to upload files.");
      handleFilesSelected(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchImagesAndConfig(); // Refresh list and config
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDurationChange = (filename: string, value: string) => {
    const seconds = parseInt(value, 10);
    if (!isNaN(seconds) && seconds > 0) {
      setImageDurations((prev) => ({
        ...prev,
        [filename]: seconds * MS_PER_SECOND,
      }));
    } else if (value === '') {
      // Allow clearing the input
      setImageDurations((prev) => {
        const newDurations = { ...prev };
        delete newDurations[filename];
        return newDurations;
      });
    }
  };

  const handleSaveDurations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`,
        },
        body: JSON.stringify(imageDurations),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save durations.");
      alert("Durations saved successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setCurrentTheme((prevTheme) => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'system';
      return 'light';
    });
  };

  const nextThemeLabel =
    currentTheme === 'light'
      ? 'Dark'
      : currentTheme === 'dark'
        ? 'System'
        : 'Light';

  return (
    <div style={styles.fullPageContainer}>
      <div style={styles.surface}>
        <div style={styles.headerBar}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Admin Panel</h1>
            <p style={styles.subtitle}>Keep your slideshow images organized and up to date.</p>
          </div>
          <button
            onClick={toggleTheme}
            style={styles.themeToggleButton}
            title={`Switch to ${nextThemeLabel} theme`}
            aria-label={`Switch to ${nextThemeLabel} theme`}
          >
            <span style={styles.themeToggleIcon}>{resolvedThemeIcon}</span>
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {!isAuthenticated ? (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Sign In</h2>
              <p style={styles.sectionSubtitle}>Use the admin password to access slideshow controls.</p>
            </div>
            <form onSubmit={handleLogin} style={styles.authForm}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                style={styles.passwordInput}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={isLoading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Upload Images</h2>
                <p style={styles.sectionSubtitle}>Add new images to the slideshow lineup.</p>
              </div>
              <form onSubmit={handleUpload} style={styles.uploadForm}>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={isDragActive ? { ...styles.dropZone, ...styles.dropZoneActive } : styles.dropZone}
                >
                  <div style={styles.dropZoneIcon}>🖼️</div>
                  <p style={styles.dropZoneHeadline}>Drag & drop images here</p>
                  <p style={styles.dropZoneCaption}>or click to browse files</p>
                  {filesToUpload && filesToUpload.length > 0 && (
                    <p style={styles.dropZoneMeta}>
                      {filesToUpload.length === 1
                        ? filesToUpload[0]?.name
                        : `${filesToUpload.length} files selected`}
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    id="file-input"
                    type="file"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    multiple
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !filesToUpload || filesToUpload.length === 0}
                  style={isLoading || !filesToUpload || filesToUpload.length === 0 ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
                >
                  {isLoading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Image Library</h2>
                <p style={styles.sectionSubtitle}>Adjust display duration or remove images you no longer need.</p>
              </div>

              {images.length > 0 ? (
                <>
                  <div style={styles.buttonRow}>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={isLoading || selectedImages.size === 0}
                      style={isLoading || selectedImages.size === 0 ? { ...styles.button, ...styles.buttonDisabled } : { ...styles.button, ...styles.buttonDelete }}
                    >
                      {`Delete Selected (${selectedImages.size})`}
                    </button>
                    <button
                      onClick={handleSaveDurations}
                      disabled={isLoading}
                      style={isLoading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
                    >
                      Save Durations
                    </button>
                  </div>

                  <ul style={styles.fileList}>
                    {images.map((image) => (
                      <li key={image} style={styles.fileListItem}>
                        <div style={styles.fileInfoRow}>
                          <input
                            type="checkbox"
                            checked={selectedImages.has(image)}
                            onChange={() => handleToggleSelect(image)}
                            disabled={isLoading}
                          />
                          <img src={`/api/image/${encodeURIComponent(image)}`} alt={image} style={styles.imagePreview} />
                          <div style={styles.fileMeta}>
                            <span style={styles.fileNameText}>{image}</span>
                          </div>
                        </div>
                        <div style={styles.durationControl}>
                          <span style={styles.durationLabel}>Display duration</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={Math.round((imageDurations[image] ?? DEFAULT_SLIDE_DURATION_MS) / MS_PER_SECOND)}
                              onChange={(e) => handleDurationChange(image, e.target.value)}
                              style={styles.durationInput}
                              disabled={isLoading}
                            />
                            <span>seconds</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div style={styles.emptyState}>
                  <p style={{ margin: 0, fontWeight: 600 }}>No images yet.</p>
                  <p style={{ margin: 0 }}>Upload images to start building your slideshow.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
