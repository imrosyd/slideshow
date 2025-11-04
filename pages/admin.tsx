import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { ToastProvider } from "../components/admin/ToastProvider";
import { UploadBox } from "../components/admin/UploadBox";
import { ImageCard } from "../components/admin/ImageCard";
import { ConfirmModal } from "../components/admin/ConfirmModal";
import { useImages } from "../hooks/useImages";
import { useToast } from "../hooks/useToast";
import { getAdminAuthCookieName, getExpectedAdminToken } from "../lib/auth";

const AdminContent = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pushToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = sessionStorage.getItem("admin-auth-token");
    if (token) {
      setAuthToken(token);
    }
    const previousSelect = document.body.style.userSelect;
    const previousTouch = document.body.style.touchAction;
    document.body.style.userSelect = "auto";
    document.body.style.touchAction = "auto";
    return () => {
      document.body.style.userSelect = previousSelect;
      document.body.style.touchAction = previousTouch;
    };
  }, []);

  const {
    images,
    isLoading,
    isUploading,
    uploadTasks,
    isSavingMetadata,
    dirtyCount,
    refresh,
    uploadImages,
    deleteImage,
    updateMetadataDraft,
    resetMetadataDraft,
    saveMetadata,
    reorderImages,
  } = useImages(authToken);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hiddenImages, setHiddenImages] = useState<Set<string>>(new Set());
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);

  const galleryStats = useMemo(() => {
    const totalSize = images.reduce((sum, image) => sum + (image.size || 0), 0);
    return {
      total: images.length,
      totalSize,
      formattedSize:
        totalSize === 0
          ? "0 B"
          : (() => {
              const units = ["B", "KB", "MB", "GB"];
              const exponent = Math.min(Math.floor(Math.log(totalSize) / Math.log(1024)), units.length - 1);
              const value = totalSize / Math.pow(1024, exponent);
              return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
            })(),
    };
  }, [images]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      const result = await uploadImages(files);
      if (result.success) {
        pushToast({ variant: "success", description: `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully.` });
      } else {
        pushToast({ variant: "error", description: "Some uploads failed. Check the status panel for details." });
      }
    },
    [pushToast, uploadImages]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      setIsDeleting(true);
      try {
        const success = await deleteImage([filename]);
        if (success) {
          pushToast({ variant: "success", description: `${filename} deleted.` });
        } else {
          pushToast({ variant: "error", description: `Failed to delete ${filename}.` });
        }
        return success;
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteImage, pushToast]
  );

  const handleSaveMetadata = useCallback(async () => {
    const success = await saveMetadata();
    if (success) {
      pushToast({ variant: "success", description: "Metadata saved successfully." });
    } else {
      pushToast({ variant: "error", description: "Unable to save metadata." });
    }
  }, [pushToast, saveMetadata]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      sessionStorage.removeItem("admin-auth-token");
      setAuthToken(null);
      pushToast({ variant: "success", description: "Signed out." });
      await router.replace("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
      pushToast({ variant: "error", description: "Unable to sign out." });
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, pushToast, router]);

  const handleForceRefresh = useCallback(async () => {
    if (isForceRefreshing) return;
    setIsForceRefreshing(true);
    try {
      const response = await fetch("/api/admin/force-refresh", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      pushToast({ 
        variant: "success", 
        description: "Slideshow refresh signal sent! Main page will update shortly." 
      });
      console.log('Force refresh triggered:', data);
    } catch (error) {
      console.error("Failed to force refresh:", error);
      pushToast({ 
        variant: "error", 
        description: "Failed to send refresh signal to slideshow." 
      });
    } finally {
      setIsForceRefreshing(false);
    }
  }, [isForceRefreshing, pushToast]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  }, [draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    reorderImages(draggedIndex, dropIndex);
    setDraggedIndex(null);
  }, [draggedIndex, reorderImages]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const toggleHideImage = useCallback((filename: string) => {
    setHiddenImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  }, []);

  const openFullscreen = useCallback((filename: string) => {
    setFullscreenImage(filename);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  // Close fullscreen with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        closeFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, closeFullscreen]);

  const visibleImages = useMemo(() => {
    return images.filter(img => !hiddenImages.has(img.name));
  }, [images, hiddenImages]);

  return (
    <div className="relative w-full min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white touch-auto select-text">
      {/* Animated background gradient */}
      <div className="pointer-events-none fixed -top-32 -right-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl"></div>
      <div className="pointer-events-none fixed -bottom-36 -left-20 h-[500px] w-[500px] rounded-full bg-violet-500/15 blur-3xl"></div>
      
      {/* Main container */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        
        {/* Header */}
        <header className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">Slideshow Manager</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70">
                Upload images, customize durations, and manage your slideshow presentation
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => refresh()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Gallery
              </button>
              <button
                type="button"
                onClick={handleForceRefresh}
                disabled={isForceRefreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title="Force update main slideshow display"
              >
                {isForceRefreshing ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-transparent"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Force Update Slideshow
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2">
              <span className="text-sm font-semibold text-emerald-200">{galleryStats.total} Images</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-4 py-2">
              <span className="text-sm font-semibold text-sky-200">Storage: {galleryStats.formattedSize}</span>
            </div>
            {dirtyCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 animate-pulse">
                <span className="text-sm font-semibold text-amber-200">{dirtyCount} Unsaved Changes</span>
              </div>
            )}
          </div>
        </header>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Left sidebar - Upload & Actions */}
          <aside className="flex flex-col gap-6 lg:col-span-4 xl:col-span-3">
            
            {/* Upload section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg">
              <h2 className="mb-4 text-lg font-semibold text-white">Upload Images</h2>
              <UploadBox isUploading={isUploading} uploadTasks={uploadTasks} onFilesSelected={handleUpload} />
            </div>

            {/* Metadata save section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg">
              <h2 className="mb-4 text-lg font-semibold text-white">Metadata Settings</h2>
              <p className="mb-6 text-sm leading-relaxed text-white/70">
                Customize slide duration and add optional captions for each image
              </p>
              <button
                type="button"
                onClick={handleSaveMetadata}
                disabled={dirtyCount === 0 || isSavingMetadata}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSavingMetadata ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Saving...
                    </>
                  ) : dirtyCount > 0 ? (
                    <>Save {dirtyCount} Change{dirtyCount > 1 ? "s" : ""}</>
                  ) : (
                    <>All Saved</>
                  )}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
              </button>
            </div>

            {/* Quick stats */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg">
              <h3 className="mb-4 text-sm font-semibold text-white/90">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Total Images</span>
                  <span className="font-semibold text-white">{images.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Hidden</span>
                  <span className="font-semibold text-amber-300">{hiddenImages.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Visible</span>
                  <span className="font-semibold text-emerald-300">{images.length - hiddenImages.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Uploading</span>
                  <span className="font-semibold text-white">{uploadTasks.filter(t => t.status === 'uploading').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Storage Used</span>
                  <span className="font-semibold text-white">{galleryStats.formattedSize}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main gallery area */}
          <main className="lg:col-span-8 xl:col-span-9">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Image Gallery</h2>
                  <p className="text-sm text-white/60">
                    {images.length === 0 ? "No images yet" : `${images.length} image${images.length !== 1 ? "s" : ""} • Drag to reorder`}
                  </p>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                    Loading...
                  </div>
                )}
              </div>

              {images.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-5xl text-white/40">
                    +
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">No Images Yet</h3>
                    <p className="max-w-md text-sm text-white/60">
                      Start by uploading your first image using the upload panel on the left
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={image.name}
                      className="relative cursor-move transition-all duration-200"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: draggedIndex === index ? 0.5 : 1,
                        transform: draggedIndex === index ? 'scale(0.95)' : 'scale(1)',
                      }}
                    >
                      <div className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-lg">
                        {index + 1}
                      </div>
                      <ImageCard
                        image={image}
                        onChange={updateMetadataDraft}
                        onReset={resetMetadataDraft}
                        onDelete={(filename) => setConfirmTarget(filename)}
                        onToggleHide={toggleHideImage}
                        onPreview={openFullscreen}
                        isHidden={hiddenImages.has(image.name)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Confirm delete modal */}
      <ConfirmModal
        open={Boolean(confirmTarget)}
        title="Delete this image?"
        description={confirmTarget ? `"${confirmTarget}" will be permanently removed from storage. This action cannot be undone.` : ""}
        onCancel={() => setConfirmTarget(null)}
        isLoading={isDeleting}
        onConfirm={async () => {
          if (confirmTarget) {
            const didDelete = await handleDelete(confirmTarget);
            if (didDelete) {
              setConfirmTarget(null);
            }
          }
        }}
      />

      {/* Fullscreen preview modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeFullscreen}
        >
          <button
            type="button"
            onClick={closeFullscreen}
            className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
            title="Close preview"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute left-6 top-6 z-10 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="text-sm font-medium text-white">{fullscreenImage}</span>
          </div>
          <img
            src={images.find(img => img.name === fullscreenImage)?.previewUrl}
            alt={fullscreenImage}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default function AdminPage() {
  return (
    <ToastProvider>
      <Head>
        <title>Admin Dashboard · Slideshow</title>
      </Head>
      <AdminContent />
    </ToastProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return {
        redirect: { destination: "/login", permanent: false },
      };
    }

    const expectedToken = getExpectedAdminToken(adminPassword);
    const cookieName = getAdminAuthCookieName();
    const cookieToken = context.req.cookies?.[cookieName];

    if (!cookieToken || cookieToken !== expectedToken) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    return { props: {} };
  } catch (error) {
    console.error("Error checking admin auth:", error);
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
};
