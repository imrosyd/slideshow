import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { QRCodeSVG } from 'qrcode.react';
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
  const [togglingImage, setTogglingImage] = useState<string | null>(null); // Track which image is being toggled
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
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "visible" | "hidden">("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "size" | "date">("order");
  
  // Bulk actions
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [bulkDuration, setBulkDuration] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);

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

  const openFullscreen = useCallback((filename: string) => {
    setFullscreenImage(filename);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  // Bulk action handlers
  const toggleSelectImage = useCallback((imageName: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageName)) {
        newSet.delete(imageName);
      } else {
        newSet.add(imageName);
      }
      return newSet;
    });
  }, []);

  const selectAllFiltered = useCallback((imageNames: string[]) => {
    const allNames = new Set(imageNames);
    setSelectedImages(allNames);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  const bulkSetDuration = useCallback(async () => {
    const durationMs = parseInt(bulkDuration);
    if (!durationMs || durationMs < 1000) {
      pushToast({ variant: "error", description: "Please enter a valid duration (minimum 1 second)" });
      return;
    }

    try {
      const updates: Record<string, number> = {};
      selectedImages.forEach(name => {
        updates[name] = durationMs;
      });

      const response = await fetch("/api/admin/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durations: updates }),
      });

      if (!response.ok) throw new Error("Failed to update durations");

      pushToast({ variant: "success", description: `Updated duration for ${selectedImages.size} image${selectedImages.size !== 1 ? 's' : ''}` });
      setSelectedImages(new Set());
      setBulkDuration("");
      await refresh();
    } catch (error) {
      console.error("Bulk duration update error:", error);
      pushToast({ variant: "error", description: "Failed to update durations" });
    }
  }, [bulkDuration, selectedImages, pushToast, refresh]);

  const bulkDeleteImages = useCallback(async () => {
    if (!confirm(`Are you sure you want to delete ${selectedImages.size} image${selectedImages.size !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedImages).map(async (filename) => {
        const response = await fetch("/api/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename }),
        });
        if (!response.ok) throw new Error(`Failed to delete ${filename}`);
      });

      await Promise.all(deletePromises);
      pushToast({ variant: "success", description: `Deleted ${selectedImages.size} image${selectedImages.size !== 1 ? 's' : ''}` });
      setSelectedImages(new Set());
      await refresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      pushToast({ variant: "error", description: "Failed to delete some images" });
    }
  }, [selectedImages, pushToast, refresh]);

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

  const filteredImages = useMemo(() => {
    let filtered = [...images];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(img => 
        img.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "size":
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
      case "date":
        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case "order":
      default:
        // Keep original order (already sorted by API)
        break;
    }

    return filtered;
  }, [images, searchQuery, filterStatus, sortBy]);

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
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Image Gallery</h2>
                    <p className="text-sm text-white/60">
                      {filteredImages.length === 0 ? "No images match your filters" : `${filteredImages.length} of ${images.length} image${images.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                      Loading...
                    </div>
                  )}
                </div>

                {/* Search and Filter Controls */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {/* Search Box */}
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search images..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Filter Status */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    style={{
                      colorScheme: 'dark',
                    }}
                  >
                    <option value="all" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>All Images</option>
                    <option value="visible" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Visible Only</option>
                    <option value="hidden" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Hidden Only</option>
                  </select>

                  {/* Sort By */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    style={{
                      colorScheme: 'dark',
                    }}
                  >
                    <option value="order" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Sort: Order</option>
                    <option value="name" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Sort: Name</option>
                    <option value="size" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Sort: Size</option>
                    <option value="date" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Sort: Date</option>
                  </select>

                  {/* Bulk Actions Toggle */}
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      showBulkActions
                        ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
                        : "border-white/20 bg-white/5 text-white hover:border-violet-400/30 hover:bg-violet-500/10"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Bulk
                  </button>
                </div>

                {/* Bulk Actions Panel */}
                {showBulkActions && (
                  <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-violet-200">
                          {selectedImages.size} selected
                        </span>
                        <button
                          onClick={() => selectAllFiltered(filteredImages.map(img => img.name))}
                          className="text-xs text-violet-300 hover:text-violet-100 underline"
                        >
                          Select all ({filteredImages.length})
                        </button>
                        {selectedImages.size > 0 && (
                          <button
                            onClick={deselectAll}
                            className="text-xs text-violet-300 hover:text-violet-100 underline"
                          >
                            Deselect all
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedImages.size > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Duration (ms)"
                            value={bulkDuration}
                            onChange={(e) => setBulkDuration(e.target.value)}
                            className="w-32 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                          />
                          <button
                            onClick={bulkSetDuration}
                            disabled={!bulkDuration}
                            className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200 transition-all hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Set Duration
                          </button>
                        </div>

                        <button
                          onClick={bulkDeleteImages}
                          className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 transition-all hover:bg-red-500/30"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {filteredImages.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-5xl text-white/40">
                    {searchQuery || filterStatus !== "all" ? "🔍" : "+"}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {searchQuery || filterStatus !== "all" ? "No Images Found" : "No Images Yet"}
                    </h3>
                    <p className="max-w-md text-sm text-white/60">
                      {searchQuery || filterStatus !== "all" 
                        ? "Try adjusting your search or filter criteria"
                        : "Start by uploading your first image using the upload panel on the left"
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredImages.map((image, index) => {
                    const originalIndex = images.findIndex(img => img.name === image.name);
                    const isSelected = selectedImages.has(image.name);
                    return (
                      <div
                        key={image.name}
                        className="relative cursor-move transition-all duration-200"
                        draggable={sortBy === "order" && !showBulkActions}
                        onDragStart={() => sortBy === "order" && !showBulkActions && handleDragStart(originalIndex)}
                        onDragOver={(e) => sortBy === "order" && !showBulkActions && handleDragOver(e, originalIndex)}
                        onDrop={(e) => sortBy === "order" && !showBulkActions && handleDrop(e, originalIndex)}
                        onDragEnd={handleDragEnd}
                        style={{
                          opacity: draggedIndex === originalIndex ? 0.5 : 1,
                          transform: draggedIndex === originalIndex ? 'scale(0.95)' : 'scale(1)',
                          cursor: sortBy === "order" && !showBulkActions ? "move" : "default",
                        }}
                      >
                        {/* Selection Checkbox */}
                        {showBulkActions && (
                          <div className="absolute -left-2 -top-2 z-20">
                            <button
                              onClick={() => toggleSelectImage(image.name)}
                              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all shadow-lg ${
                                isSelected
                                  ? "border-violet-400 bg-violet-500 text-white"
                                  : "border-white/30 bg-slate-800/90 text-white/60 hover:border-violet-400/50 hover:bg-violet-500/20"
                              }`}
                            >
                              {isSelected && (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Order Number */}
                        {!showBulkActions && (
                          <div className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-lg">
                            {originalIndex + 1}
                          </div>
                        )}

                        {/* Image Card with Selection Highlight */}
                        <div className={`transition-all ${isSelected ? 'ring-4 ring-violet-400/50 rounded-xl' : ''}`}>
                          <ImageCard
                            image={image}
                            onChange={updateMetadataDraft}
                            onReset={resetMetadataDraft}
                            onDelete={(filename) => setConfirmTarget(filename)}
                            onPreview={openFullscreen}
                          />
                        </div>
                      </div>
                    );
                  })}
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
