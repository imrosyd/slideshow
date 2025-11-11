import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
const QRCodeSVG = dynamic(async () => (await import('qrcode.react')).QRCodeSVG as any, { ssr: false }) as any;

// Precompute Supabase origin for resource hints on admin page
const SUPABASE_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
})();
import { ToastProvider } from "../components/admin/ToastProvider";

// Lazy-load komponen berat untuk memperkecil bundle awal halaman admin
const UploadBox = dynamic(async () => (await import("../components/admin/UploadBox")).UploadBox as any, { ssr: false }) as any;
const ImageCard = dynamic(async () => (await import("../components/admin/ImageCard")).ImageCard as any, { ssr: false }) as any;
const ConfirmModal = dynamic(async () => (await import("../components/admin/ConfirmModal")).ConfirmModal as any, { ssr: false }) as any;
const MergeVideoDialog = dynamic(async () => (await import("../components/admin/MergeVideoDialog")).MergeVideoDialog as any, { ssr: false }) as any;
const BulkEditDialog = dynamic(async () => (await import("../components/admin/BulkEditDialog")).BulkEditDialog as any, { ssr: false }) as any;
import { useImages } from "../hooks/useImages";
import { useToast } from "../hooks/useToast";
import { getAdminAuthCookieName, getExpectedAdminToken } from "../lib/auth";

const AdminContent = () => {
  // (Reserved) additional admin-only state
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [togglingImage, setTogglingImage] = useState<string | null>(null); // Track which image is being toggled
  
  // States for custom dialogs
  const [renameDialog, setRenameDialog] = useState<{ filename: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [cleanupConfirm, setCleanupConfirm] = useState(false);
  const [deleteVideoConfirm, setDeleteVideoConfirm] = useState<string | null>(null);
  const [mergeVideoDialog, setMergeVideoDialog] = useState(false);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<Set<string>>(new Set());
  const [mergeProgress, setMergeProgress] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [isCleaningCorrupt, setIsCleaningCorrupt] = useState(false);
  
  const { pushToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Get tokens from sessionStorage
    const sessionToken = sessionStorage.getItem("admin-auth-token");
    const supabaseToken = sessionStorage.getItem("supabase-token");
    
    if (sessionToken) {
      setAuthToken(sessionToken);
    }
    
    // Check session with session manager
    const checkSession = async () => {
      if (!supabaseToken) {
        console.warn("[Admin] No Supabase token - session check skipped");
        return;
      }
      
      try {
        console.log("[Admin] Checking session...");
        const response = await fetch("/api/session/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseToken}`,
          },
          body: JSON.stringify({ page: "admin" }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error("[Admin] Session check failed:", error);
          
          if (error.error === "concurrent_session") {
            // Another user is logged in - logout this session
            console.warn("[Admin] Concurrent session detected, logging out");
            sessionStorage.removeItem("admin-auth-token");
            sessionStorage.removeItem("supabase-token");
            pushToast({ 
              variant: "error", 
              description: `Another user (${error.activeUser}) is logged in. Please try again.` 
            });
            router.push("/login");
          }
        } else {
          console.log("[Admin] Session check successful");
        }
      } catch (error) {
        console.error("[Admin] Session check error:", error);
      }
    };
    
    checkSession();
    
    const previousSelect = document.body.style.userSelect;
    const previousTouch = document.body.style.touchAction;
    document.body.style.userSelect = "auto";
    document.body.style.touchAction = "auto";
    return () => {
      document.body.style.userSelect = previousSelect;
      document.body.style.touchAction = previousTouch;
    };
  }, [pushToast, router]);

  const {
    images,
    isLoading,
    isUploading,
    uploadTasks,
    isSavingMetadata,
    refresh,
    uploadImages,
    deleteImage,
    updateMetadataDraft,
    updateMultipleMetadataDraft,
    resetMetadataDraft,
    saveMetadata,
    saveMultipleMetadata,
    reorderImages,
    generateBatchVideo,
    deleteVideo,
    renameImage,
    convertPdfToImages,
  } = useImages(authToken);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [savingImageFor, setSavingImageFor] = useState<string | null>(null);
  const [renamingImage, setRenamingImage] = useState<string | null>(null);

  // Track if auto-generate has been done for current images
  const hasAutoGenerated = useRef(false);

  const galleryStats = useMemo(() => {
    const totalSize = images.reduce((sum, image) => sum + (image.size || 0), 0);
    const totalVideos = images.filter((image) => image.isVideo && image.videoUrl).length;
    const formattedSize = (() => {
      if (totalSize === 0) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const exponent = Math.min(Math.floor(Math.log(totalSize) / Math.log(1024)), units.length - 1);
      const value = totalSize / Math.pow(1024, exponent);
      const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value) : parseFloat(value.toFixed(1));
      return `${rounded} ${units[exponent]}`;
    })();
    return {
      total: images.length,
      totalSize,
      formattedSize,
      totalVideos,
    };
  }, [images]);

  const uploadingCount = useMemo(
    () => uploadTasks.filter((task) => task.status === "uploading").length,
    [uploadTasks]
  );

  // Removed auto-generate video feature - videos are only generated via manual button clicks

  const handleUpload = useCallback(
    async (files: File[]) => {
      const result = await uploadImages(files);
      if (result.success) {
        pushToast({ 
          variant: "success", 
          description: `Successfully uploaded ${files.length} file${files.length > 1 ? "s" : ""}` 
        });
      } else {
        pushToast({ 
          variant: "error", 
          description: "Some uploads failed. Check the status panel." 
        });
      }
    },
    [pushToast, uploadImages]
  );

  const handlePdfUpload = useCallback(
    async (file: File) => {
      pushToast({ 
        variant: "info", 
        description: `Converting PDF "${file.name}" to images...` 
      });
      
      try {
        const result = await convertPdfToImages(file);
        if (result.success && result.images && result.images.length > 0) {
          pushToast({ 
            variant: "success", 
            description: `Successfully converted PDF to ${result.images.length} image${result.images.length > 1 ? "s" : ""}` 
          });
        } else {
          pushToast({ 
            variant: "error", 
            description: "Failed to convert PDF - no images generated" 
          });
        }
      } catch (error) {
        console.error("PDF conversion error:", error);
        pushToast({ 
          variant: "error", 
          description: error instanceof Error ? error.message : "An error occurred while converting PDF" 
        });
      }
    },
    [pushToast, convertPdfToImages]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      setIsDeleting(true);
      try {
        const success = await deleteImage([filename]);
        if (success) {
          pushToast({ 
            variant: "success", 
            description: `Successfully deleted "${filename}"` 
          });
        } else {
          pushToast({ 
            variant: "error", 
            description: `Failed to delete "${filename}"` 
          });
        }
        return success;
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteImage, pushToast]
  );

  const handleBulkDelete = useCallback(
    async (filenames: string[]) => {
      setIsDeleting(true);
      try {
        const success = await deleteImage(filenames);
        if (success) {
          pushToast({ 
            variant: "success", 
            description: `Successfully deleted ${filenames.length} image${filenames.length > 1 ? "s" : ""}` 
          });
        } else {
          pushToast({ 
            variant: "error", 
            description: `Failed to delete images` 
          });
        }
        return success;
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteImage, pushToast]
  );

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // Get Supabase token for session logout
      const supabaseToken = sessionStorage.getItem("supabase-token");
      
      // Call cookie-based logout
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      // Call session-based logout if we have a token
      if (supabaseToken) {
        try {
          await fetch("/api/session/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseToken}`,
            },
          });
        } catch (sessionError) {
          console.error("Failed to clear session:", sessionError);
        }
      }
      
      // Clear all tokens
      sessionStorage.removeItem("admin-auth-token");
      sessionStorage.removeItem("supabase-token");
      setAuthToken(null);
      
      pushToast({ 
        variant: "success", 
        description: "Successfully signed out" 
      });
      await router.replace("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
      pushToast({ 
        variant: "error", 
        description: "Failed to sign out" 
      });
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, pushToast, router]);

  

  const handleSaveIndividual = useCallback(
    async (filename: string) => {
      try {
        setSavingImageFor(filename);
        
        // Find the image to save
        const imageToSave = images.find(img => img.name === filename);
        if (!imageToSave) {
          throw new Error("Image not found");
        }

        // Call API directly to save single image
        const response = await fetch("/api/admin/metadata", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
          },
          body: JSON.stringify([{
            filename: imageToSave.name,
            durationMs: imageToSave.durationSeconds !== null && imageToSave.durationSeconds !== undefined ? imageToSave.durationSeconds * 1000 : null,
            caption: imageToSave.caption || null,
            order: images.findIndex(img => img.name === filename),
          }]),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        // Reset the "original" values so changes are no longer dirty
        resetMetadataDraft(filename);
        
        pushToast({
          variant: "success",
          description: `Successfully saved changes for "${filename}"`,
        });
        
        // Refresh to get updated data from server
        await refresh();
      } catch (error) {
        console.error("Save individual error:", error);
        pushToast({
          variant: "error",
          description: `Failed to save changes: ${error}`,
        });
      } finally {
        setSavingImageFor(null);
      }
    },
    [images, authToken, resetMetadataDraft, pushToast, refresh]
  );

  const handleRenameImage = useCallback(
    async (filename: string) => {
      const extensionIndex = filename.lastIndexOf(".");
      const extension = extensionIndex >= 0 ? filename.slice(extensionIndex) : "";
      const currentBase = extensionIndex >= 0 ? filename.slice(0, extensionIndex) : filename;

      // Open custom rename dialog
      setRenameInput(currentBase);
      setRenameDialog({ filename });
    },
    []
  );

  const handleRenameConfirm = useCallback(
    async () => {
      if (!renameDialog) return;
      
      const { filename } = renameDialog;
      const extensionIndex = filename.lastIndexOf(".");
      const extension = extensionIndex >= 0 ? filename.slice(extensionIndex) : "";

      const trimmedBase = renameInput.trim();
      if (!trimmedBase) {
        pushToast({ 
          variant: "error", 
          description: "Filename cannot be empty" 
        });
        return;
      }

      let nextName = trimmedBase;
      if (extension && !trimmedBase.toLowerCase().endsWith(extension.toLowerCase())) {
        nextName = `${trimmedBase}${extension}`;
      }

      if (nextName.includes("/") || nextName.includes("\\")) {
        pushToast({ 
          variant: "error", 
          description: "Filename cannot contain path separators" 
        });
        return;
      }

      try {
        setRenamingImage(filename);
        await renameImage(filename, nextName);
        pushToast({ 
          variant: "success", 
          description: `Successfully renamed to "${nextName}"` 
        });
        setRenameDialog(null);
        setRenameInput("");
      } catch (error) {
        console.error("Rename error:", error);
        pushToast({
          variant: "error",
          description: error instanceof Error ? error.message : "Failed to rename file",
        });
      } finally {
        setRenamingImage(null);
      }
    },
    [renameDialog, renameInput, renameImage, pushToast]
  );

  const handleCleanupVideos = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cleanup-videos', {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
        },
      });
      const data = await response.json();
      if (data.success) {
        pushToast({
          variant: "success",
          description: data.message,
        });
        setCleanupConfirm(false);
      } else {
        throw new Error(data.error || 'Cleanup failed');
      }
    } catch (error) {
      pushToast({
        variant: "error",
        description: `Cleanup failed: ${error}`,
      });
    }
  }, [authToken, pushToast]);

  const handleDeleteVideoConfirm = useCallback(async () => {
    if (!deleteVideoConfirm) return;
    
    try {
      await deleteVideo(deleteVideoConfirm);
      pushToast({
        variant: "success",
        description: `Video deleted for ${deleteVideoConfirm}`,
      });
      setDeleteVideoConfirm(null);
      
      // Refresh to show updated state
      await refresh();
    } catch (error) {
      pushToast({
        variant: "error",
        description: `Failed to delete video: ${error}`,
      });
    }
  }, [deleteVideoConfirm, deleteVideo, pushToast, refresh]);

  const handleCleanupCorruptVideos = useCallback(async () => {
    if (isCleaningCorrupt) return;
    setIsCleaningCorrupt(true);
    
    try {
      pushToast({ 
        variant: "info", 
        description: "Checking for corrupt videos and orphaned files..." 
      });

      const response = await fetch("/api/admin/cleanup-corrupt-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Cleanup failed");
      }

      const result = await response.json();
      
      let message = "";
      let totalCleaned = 0;
      
      if (result.orphanedFiles && result.orphanedFiles > 0) {
        message += `Removed ${result.orphanedFiles} orphaned file(s) from storage. `;
        totalCleaned += result.orphanedFiles;
      }
      
      if (result.orphanedDbEntries && result.orphanedDbEntries > 0) {
        message += `Removed ${result.orphanedDbEntries} orphaned database entry(ies). `;
        totalCleaned += result.orphanedDbEntries;
      }
      
      if (result.deleted > 0) {
        message += `Cleaned up ${result.deleted} corrupt video(s). `;
        totalCleaned += result.deleted;
      }
      
      if (totalCleaned === 0) {
        message = `No issues found. All ${result.kept} video(s) are valid.`;
      } else {
        message += `${result.kept} valid video(s) kept.`;
      }
      
      pushToast({ 
        variant: "success", 
        description: message.trim()
      });
      
      // Refresh gallery to reflect changes
      await refresh();
    } catch (error) {
      console.error("Cleanup corrupt videos error:", error);
      pushToast({ 
        variant: "error", 
        description: error instanceof Error ? error.message : "Failed to cleanup corrupt videos" 
      });
    } finally {
      setIsCleaningCorrupt(false);
    }
  }, [isCleaningCorrupt, pushToast, refresh]);

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
        description: "Slideshow refresh signal sent successfully" 
      });
      console.log('Force refresh triggered:', data);
    } catch (error) {
      console.error("Failed to force refresh:", error);
      pushToast({ 
        variant: "error", 
        description: "Failed to send refresh signal" 
      });
    } finally {
      setIsForceRefreshing(false);
    }
  }, [isForceRefreshing, pushToast]);

  

  const handleMergeVideo = useCallback(async () => {
    // Get gallery-visible images that have non-zero duration (same as main page gallery)
    const visibleImages = images.filter(img => !img.hidden && !img.isVideo && img.durationSeconds !== 0);
    
    if (visibleImages.length < 1) {
      pushToast({ variant: "error", description: "Need at least 1 image with non-zero duration to merge" });
      setMergeVideoDialog(false);
      return;
    }

    setIsMerging(true);
    setMergeProgress(`Preparing to merge ${visibleImages.length} images with visible duration...`);

    try {
      setMergeProgress("Downloading images from storage...");
      
      const response = await fetch("/api/admin/merge-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: visibleImages.map(img => ({
            filename: img.name,
            durationSeconds: img.durationSeconds || 10,
          })),
          // No outputFilename needed anymore - always dashboard
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to merge video");
      }

      setMergeProgress("Creating merged video...");
      const data = await response.json();
      
      setMergeProgress("Upload complete! Refreshing...");
      
      pushToast({ 
        variant: "success", 
        description: `Dashboard video created successfully!` 
      });
      
      // Refresh images to show the new merged video
      await refresh();
      
      setMergeVideoDialog(false);
    } catch (error) {
      console.error("Merge video error:", error);
      pushToast({ 
        variant: "error", 
        description: error instanceof Error ? error.message : "Failed to merge video" 
      });
      setMergeVideoDialog(false);
    } finally {
      setIsMerging(false);
      setMergeProgress("");
    }
  }, [images, pushToast, refresh]);

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
    if (!searchQuery) {
      return images;
    }

    return images.filter((img) =>
      img.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

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
                onClick={() => setBulkEditDialog(true)}
                disabled={images.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 transition hover:border-sky-400/50 hover:bg-sky-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                title="Bulk edit images"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                type="button"
                onClick={() => setMergeVideoDialog(true)}
                disabled={images.filter(img => !img.hidden && !img.isVideo && img.durationSeconds !== 0).length < 1}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-200 transition hover:border-purple-400/50 hover:bg-purple-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title="Merge visible images into one video with individual durations"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
              
              <button
                type="button"
                onClick={handleForceRefresh}
                disabled={isForceRefreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title="Force update main slideshow display"
              >
                {isForceRefreshing ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-transparent"></span>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title="Logout"
              >
                {isLoggingOut ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-transparent"></span>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
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
          </div>
        </header>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Left sidebar - Upload & Actions */}
          <aside className="flex flex-col gap-6 lg:col-span-4 xl:col-span-3">
            
            {/* Upload section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg">
              <h2 className="mb-4 text-lg font-semibold text-white">Upload Images or PDF</h2>
              <UploadBox 
                isUploading={isUploading} 
                uploadTasks={uploadTasks} 
                onFilesSelected={handleUpload}
                onPdfSelected={handlePdfUpload}
              />
            </div>

            {/* Quick stats */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg">
              <h3 className="mb-4 text-sm font-semibold text-white/90">Quick Stats</h3>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-white/60">Total Images</span>
                  <span className="font-semibold text-white">{images.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-white/60">Uploading</span>
                  <span className="font-semibold text-white">{uploadingCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-white/60">Total Videos</span>
                  <span className="font-semibold text-white">{galleryStats.totalVideos}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-white/60">Storage</span>
                  <span className="font-semibold text-white">{galleryStats.formattedSize}</span>
                </div>
              </div>
            </div>

            {/* Generated Videos Section */}
            <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 shadow-glass backdrop-blur-lg">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-purple-200">Generated Videos</h3>
              </div>
              <div className="space-y-3">
                {images.filter((img) => img.isVideo && img.videoUrl).length === 0 ? (
                  <p className="text-xs text-white/50 italic">No videos generated yet</p>
                ) : (
                  images
                    .filter((img) => img.isVideo && img.videoUrl)
                    .map((img) => (
                      <div
                        key={img.name}
                        className="group relative rounded-lg border border-purple-400/30 bg-purple-500/10 p-3 transition hover:border-purple-400/50 hover:bg-purple-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-black">
                            <video src={img.videoUrl} className="h-full w-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-purple-100">
                              {img.name.replace('.jpg', '')}.mp4
                            </p>
                            <p className="mt-1 text-xs text-purple-300/70">
                              {img.videoDurationSeconds ? `${img.videoDurationSeconds}s` : ''}
                            </p>
                            <p className="mt-0.5 text-xs text-purple-300/50">
                              {img.videoGeneratedAt ? new Date(img.videoGeneratedAt).toLocaleDateString() : ''}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => window.open(img.videoUrl, '_blank')}
                              className="rounded px-2 py-1 text-xs text-purple-200 transition hover:bg-purple-400/20"
                              title="Preview video"
                            >
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteVideoConfirm(img.name)}
                              className="rounded px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
                              title="Delete video"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
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
                      {filteredImages.length === 0
                        ? 'No images match your search'
                        : `${filteredImages.length} of ${images.length} image${images.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                      Loading...
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {filteredImages.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-5xl text-white/40">
                    {searchQuery ? '?' : '+'}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {searchQuery ? 'No Images Found' : 'No Images Yet'}
                    </h3>
                    <p className="max-w-md text-sm text-white/60">
                      {searchQuery
                        ? 'Try adjusting your search keywords'
                        : 'Start by uploading your first image using the upload panel on the left'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredImages.map((image) => {
                    const originalIndex = images.findIndex((img) => img.name === image.name);
                    return (
                      <div
                        key={image.name}
                        className="relative cursor-move transition-all duration-200"
                        draggable
                        onDragStart={() => handleDragStart(originalIndex)}
                        onDragOver={(e) => handleDragOver(e, originalIndex)}
                        onDrop={(e) => handleDrop(e, originalIndex)}
                        onDragEnd={handleDragEnd}
                        style={{
                          opacity: draggedIndex === originalIndex ? 0.5 : 1,
                          transform: draggedIndex === originalIndex ? 'scale(0.95)' : 'scale(1)',
                        }}
                      >
                        

                        <ImageCard
                          image={image}
                          onChange={updateMetadataDraft}
                          onReset={resetMetadataDraft}
                          onSave={handleSaveIndividual}
                          onDelete={(filename: string) => setConfirmTarget(filename)}
                          onPreview={openFullscreen}
                          
                          onDeleteVideo={(filename: string) => setDeleteVideoConfirm(filename)}
                          
                          isSaving={savingImageFor === image.name}
                          onRename={handleRenameImage}
                          isRenaming={renamingImage === image.name}
                        />
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

      {/* Rename dialog */}
      {renameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => {
            setRenameDialog(null);
            setRenameInput("");
          }} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-glass backdrop-blur-2xl">
            <div className="flex flex-col gap-5 text-white">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white/95">Rename File</h2>
                <p className="text-sm leading-relaxed text-white/70">
                  Enter a new name for &quot;{renameDialog.filename}&quot;
                </p>
              </div>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleRenameConfirm();
                  }
                }}
                className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                placeholder="Enter new filename"
                autoFocus
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRenameDialog(null);
                    setRenameInput("");
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRenameConfirm()}
                  disabled={!renameInput.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup videos confirm dialog */}
      <ConfirmModal
        open={cleanupConfirm}
        title="Cleanup orphaned videos?"
        description="This will remove video files that are not referenced in the database. This action cannot be undone."
        confirmLabel="Cleanup"
        onCancel={() => setCleanupConfirm(false)}
        onConfirm={handleCleanupVideos}
      />

      {/* Delete video confirm dialog */}
      <ConfirmModal
        open={Boolean(deleteVideoConfirm)}
        title="Delete video?"
        description={deleteVideoConfirm ? `This will remove the video for "${deleteVideoConfirm}" but keep the image.` : ""}
        confirmLabel="Delete Video"
        onCancel={() => setDeleteVideoConfirm(null)}
        onConfirm={handleDeleteVideoConfirm}
      />

      {/* Merge video dialog */}
      <MergeVideoDialog
        isOpen={mergeVideoDialog}
        onClose={() => !isMerging && setMergeVideoDialog(false)}
        imageCount={images.filter(img => !img.hidden && !img.isVideo && img.durationSeconds !== 0).length}
        onConfirm={handleMergeVideo}
        isProcessing={isMerging}
        progress={mergeProgress}
      />

      {/* Bulk edit dialog */}
      <BulkEditDialog
        isOpen={bulkEditDialog}
        onClose={() => !isSavingMetadata && setBulkEditDialog(false)}
        images={images}
        onUpdateMultiple={updateMultipleMetadataDraft}
        onSaveAll={saveMultipleMetadata}
        onDeleteImages={handleBulkDelete}
        isSaving={isSavingMetadata}
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
        {SUPABASE_ORIGIN && (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        )}
      </Head>
      <AdminContent />
    </ToastProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      const redirect = context.query.redirect as string | undefined;
      const destination = redirect ? `/login?redirect=${redirect}` : "/login";
      return {
        redirect: { destination, permanent: false },
      };
    }

    const expectedToken = getExpectedAdminToken(adminPassword);
    const cookieName = getAdminAuthCookieName();
    const cookieToken = context.req.cookies?.[cookieName];

    if (!cookieToken || cookieToken !== expectedToken) {
      const redirect = context.query.redirect as string | undefined;
      const destination = redirect ? `/login?redirect=${redirect}` : "/login";
      return {
        redirect: {
          destination,
          permanent: false,
        },
      };
    }

    return { props: {} };
  } catch (error) {
    console.error("Error checking admin auth:", error);
    const redirect = context.query.redirect as string | undefined;
    const destination = redirect ? `/login?redirect=${redirect}` : "/login";
    return {
      redirect: {
        destination,
        permanent: false,
      },
    };
  }
};
