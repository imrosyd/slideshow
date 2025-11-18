import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UploadStatus = "pending" | "uploading" | "success" | "error";

export type UploadTask = {
  id: string;
  filename: string;
  progress: number;
  status: UploadStatus;
  error?: string | null;
};

export type ImageAsset = {
  name: string;
  size: number;
  createdAt: string | null;
  updatedAt: string | null;
  durationSeconds: number | null;
  caption: string | null;
  originalDurationSeconds: number | null;
  originalCaption: string | null;
  previewUrl: string;
  hidden?: boolean;
  // Video properties
  isVideo?: boolean;
  videoUrl?: string;
  videoGeneratedAt?: string;
  videoDurationSeconds?: number;
};

export type VideoImageData = {
  filename: string;
  durationSeconds: number;
};

type FetchState = "idle" | "loading" | "success" | "error";

const buildPreviewUrl = (filename: string) =>
  `/api/image/${encodeURIComponent(filename)}`;

const toSeconds = (value: number | null | undefined) =>
  typeof value === "number" ? Math.round(value / 1000) : null;

const toMilliseconds = (seconds: number | null) =>
  typeof seconds === "number" && !Number.isNaN(seconds) ? seconds * 1000 : null;

const generateTaskId = (filename: string, index: number) =>
  `${filename}-${Date.now()}-${index}`;

export const useImages = (authToken: string | null) => {
  const [images, setImagesInternal] = useState<ImageAsset[]>([]);
  const imagesRef = useRef<ImageAsset[]>([]);

  type ImagesUpdater = ImageAsset[] | ((prev: ImageAsset[]) => ImageAsset[]);

  const setImagesState = useCallback((updater: ImagesUpdater) => {
    setImagesInternal((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: ImageAsset[]) => ImageAsset[])(prev)
          : updater;
      imagesRef.current = next;
      return next;
    });
  }, []);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  const isLoading = fetchState === "loading";

  const refresh = useCallback(async () => {
    setFetchState("loading");
    try {
      const headers: Record<string, string> = authToken
        ? { Authorization: `Token ${authToken}` }
        : {};

      const response = await fetch("/api/admin/images", {
        headers,
        cache: "no-store", // force network fetch so visibility updates are fresh
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText);
          throw new Error(parsed?.error || "Rename failed.");
        } catch {
          throw new Error(errorText || "Rename failed.");
        }
      }

      const payload = await response.json();
      const fetched = (payload?.images ?? []).map((item: any) => {
        const durationSeconds = toSeconds(item.durationMs);
        const caption = item.caption ?? null; // Keep as null if empty
        
        // Add cache-busting timestamp to preview URL for videos or recently updated files
        let previewUrl = buildPreviewUrl(item.name);
        try {
          if (item.videoGeneratedAt) {
            // For video files, use video_generated_at as cache buster
            const timestamp = new Date(item.videoGeneratedAt).getTime();
            if (!isNaN(timestamp)) {
              previewUrl = `${previewUrl}?t=${timestamp}`;
            }
          } else if (item.updatedAt) {
            // For regular images, use updated_at as cache buster
            const timestamp = new Date(item.updatedAt).getTime();
            if (!isNaN(timestamp)) {
              previewUrl = `${previewUrl}?t=${timestamp}`;
            }
          }
        } catch (e) {
          // If timestamp parsing fails, just use URL without cache buster
          console.warn('Failed to parse timestamp for', item.name, e);
        }
        
        return {
          name: item.name,
          size: item.size ?? 0,
          createdAt: item.createdAt ?? null,
          updatedAt: item.updatedAt ?? null,
          durationSeconds,
          caption,
          originalDurationSeconds: durationSeconds,
          originalCaption: caption,
          previewUrl,
          isVideo: Boolean(item.isVideo && item.videoUrl),
          videoUrl: item.videoUrl ?? undefined,
          videoGeneratedAt: item.videoGeneratedAt ?? undefined,
          videoDurationSeconds:
            typeof item.videoDurationSeconds === "number"
              ? item.videoDurationSeconds
              : undefined,
        } as ImageAsset;
      });

      setImagesState(fetched);
      setFetchState("success");
    } catch (error) {
      console.error("Failed to fetch admin images:", error);
      setFetchState("error");
    }
  }, [authToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setUploadTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              ...patch,
            }
          : task
      )
    );
  }, []);

  const uploadImages = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return { success: false };
      }

      setIsUploading(true);
      const initialTasks = files.map((file, index) => ({
        id: generateTaskId(file.name, index),
        filename: file.name,
        progress: 0,
        status: "pending" as UploadStatus,
      }));
      setUploadTasks(initialTasks);

      const results = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const task = initialTasks[index]!;
        updateTask(task.id, { status: "uploading", progress: 0 });

        results.push(
          await new Promise<boolean>((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload");
            if (authToken) {
              xhr.setRequestHeader("Authorization", `Token ${authToken}`);
            }

            xhr.upload.onprogress = (event) => {
              if (!event.lengthComputable) return;
              const progress = Math.round((event.loaded / event.total) * 100);
              updateTask(task.id, { progress });
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                updateTask(task.id, { progress: 100, status: "success" });
                resolve(true);
              } else {
                const error =
                  xhr.responseText ||
                  `Upload failed with status ${xhr.status}`;
                updateTask(task.id, { status: "error", error });
                resolve(false);
              }
            };

            xhr.onerror = () => {
              updateTask(task.id, {
                status: "error",
                error: "Network unavailable.",
              });
              resolve(false);
            };

            const formData = new FormData();
            formData.append("file", file, file.name);
            xhr.send(formData);
          })
        );
      }

      setIsUploading(false);
      await refresh();
      return { success: results.every(Boolean) };
    },
    [authToken, refresh, updateTask]
  );

  const deleteImage = useCallback(
    async (filenames: string[]) => {
      if (!filenames.length) {
        console.error("[useImages] No filenames provided for deletion");
        return false;
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
        } else {
          console.error("[useImages] No auth token available for deletion");
          throw new Error("Authentication required for deletion");
        }

        console.log(`[useImages] Deleting ${filenames.length} file(s): ${filenames.join(", ")}`);

        const response = await fetch("/api/upload", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ filenames }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.error("[useImages] Delete request failed:", response.status, responseData);
          throw new Error(responseData.error || `Server error: ${response.status}`);
        }

        console.log("[useImages] Delete successful:", responseData);
        
        setImagesState((prev) =>
          prev.filter((image) => !filenames.includes(image.name))
        );
        return true;
      } catch (error) {
        console.error("[useImages] Failed to delete image:", error);
        return false;
      }
    },
    [authToken]
  );

  const updateMetadataDraft = useCallback(
    (filename: string, patch: Partial<Pick<ImageAsset, "durationSeconds" | "caption">>) => {
      setImagesState((prev) =>
        prev.map((image) =>
          image.name === filename
            ? {
                ...image,
                ...patch,
              }
            : image
        )
      );
    },
    []
  );

  const updateMultipleMetadataDraft = useCallback(
    (filenames: string[], updates: { durationSeconds?: number | null; caption?: string | null }) => {
      setImagesState((prev) =>
        prev.map((image) =>
          filenames.includes(image.name)
            ? {
                ...image,
                ...(updates.durationSeconds !== undefined && { durationSeconds: updates.durationSeconds }),
                ...(updates.caption !== undefined && { caption: updates.caption }),
              }
            : image
        )
      );
    },
    []
  );

  const resetMetadataDraft = useCallback((filename: string) => {
    setImagesState((prev) =>
      prev.map((image) =>
        image.name === filename
          ? {
              ...image,
              durationSeconds: image.originalDurationSeconds,
              caption: image.originalCaption,
            }
          : image
      )
    );
  }, []);

  const saveMetadata = useCallback(async () => {
    const snapshot = imagesRef.current;

    const payload = snapshot.map((image, index) => ({
      filename: image.name,
      durationMs: toMilliseconds(image.durationSeconds),
      caption: image.caption,
      order: index,
    }));

    console.log(`[useImages] saveMetadata: ${payload.length} items`);

    setIsSavingMetadata(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Token ${authToken}`;
      }

      const response = await fetch("/api/admin/metadata", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setImagesState((prev) =>
        prev.map((image) => ({
          ...image,
          originalCaption: image.caption,
          originalDurationSeconds: image.durationSeconds,
        }))
      );

      return true;
    } catch (error) {
      console.error("Failed to save metadata:", error);
      return false;
    } finally {
      setIsSavingMetadata(false);
    }
  }, [authToken, setImagesState]);

  const dirtyCount = useMemo(
    () =>
      images.filter(
        (image) =>
          image.durationSeconds !== image.originalDurationSeconds ||
          image.caption !== image.originalCaption
      ).length,
    [images]
  );

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImagesState((prev) => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  }, []);

  const renameImage = useCallback(
    async (oldName: string, newName: string) => {
      const trimmedNewName = newName.trim();
      if (!trimmedNewName || trimmedNewName === oldName) {
        return { success: false, filename: oldName };
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Token ${authToken}`;
      }

      const response = await fetch("/api/admin/rename-image", {
        method: "POST",
        headers,
        body: JSON.stringify({ oldName, newName: trimmedNewName }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      setImagesState((prev) =>
        prev.map((image) =>
          image.name === oldName
            ? {
                ...image,
                name: trimmedNewName,
                previewUrl: buildPreviewUrl(trimmedNewName),
              }
            : image
        )
      );

      return data;
    },
    [authToken, setImagesState]
  );

  const generateVideo = useCallback(
    async (filename: string, durationSeconds: number) => {
      try {
        console.log(`[useImages] Generating video for ${filename}, duration: ${durationSeconds}s`);
        
        if (!filename || !durationSeconds || durationSeconds <= 0) {
          throw new Error(`Invalid parameters: filename="${filename}", duration=${durationSeconds}`);
        }
        
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
        }

        const payload = {
          filename,
          durationSeconds,
        };
        
        console.log(`[useImages] Sending request with payload:`, payload);

        const response = await fetch("/api/admin/generate-video", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        console.log(`[useImages] Response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          console.error("[useImages] Server error response:", errorData);
          throw new Error(errorData.error || errorData.details || "Video generation failed");
        }

        const data = await response.json();
        console.log("[useImages] Video generation success:", data);

        // Update local state
        setImagesState((prev) =>
          prev.map((img) =>
            img.name === filename
              ? {
                  ...img,
                  isVideo: true,
                  videoUrl: data.videoUrl,
                  videoGeneratedAt: new Date().toISOString(),
                  videoDurationSeconds: durationSeconds,
                }
              : img
          )
        );

        return data;
      } catch (error) {
        console.error("[useImages] Video generation failed:", error);
        console.error("[useImages] Error stack:", error instanceof Error ? error.stack : "No stack");
        throw error;
      }
    },
    [authToken, setImagesState]
  );

  const generateBatchVideo = useCallback(
    async (
      filenames: string[],
      totalDurationSeconds?: number,
      videoData?: VideoImageData[]
    ) => {
      try {
        // Support both legacy format (filenames + total) and new format (videoData with per-image durations)
        let requestBody: any;
        let logMessage: string;

        if (videoData && videoData.length > 0) {
          // New format: per-image durations
          const totalDuration = videoData.reduce((sum, v) => sum + v.durationSeconds, 0);
          logMessage = `[useImages] Generating batch video for ${videoData.length} image(s), total duration: ${totalDuration}s (per-image durations)`;
          requestBody = { videoData };
        } else if (filenames.length > 0 && typeof totalDurationSeconds === "number") {
          // Legacy format: total duration distributed evenly
          logMessage = `[useImages] Generating batch video for ${filenames.length} image(s), total duration: ${totalDurationSeconds}s`;
          requestBody = { filenames, durationSeconds: totalDurationSeconds };
        } else {
          throw new Error("Missing required parameters: either (videoData) or (filenames + totalDurationSeconds)");
        }

        console.log(logMessage);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
        }

        const response = await fetch("/api/admin/generate-video", {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Batch video generation failed");
        }

        const data = await response.json();
        console.log("[useImages] Batch video generation success:", data);

        // Update local state for all images
        const imagesToUpdate = videoData
          ? videoData.map((v) => v.filename)
          : filenames;

        const videoDuration = videoData
          ? videoData.reduce((sum, v) => sum + v.durationSeconds, 0)
          : totalDurationSeconds || 0;

        setImagesState((prev) =>
          prev.map((img) =>
            imagesToUpdate.includes(img.name)
              ? {
                  ...img,
                  isVideo: true,
                  videoUrl: data.videoUrl,
                  videoGeneratedAt: new Date().toISOString(),
                  videoDurationSeconds: videoDuration,
                }
              : img
          )
        );

        return data;
      } catch (error) {
        console.error("[useImages] Batch video generation failed:", error);
        throw error;
      }
    },
    [authToken, setImagesState]
  );

  const deleteVideo = useCallback(
    async (filename: string) => {
      console.log(`[useImages] Deleting video for: ${filename}`);
      
      // Find the image to get videoUrl
      const image = imagesRef.current.find(img => img.name === filename);
      if (!image || !image.videoUrl) {
        throw new Error("Video not found for this image");
      }

      try {
        // Call delete-video API to remove file from bucket and update database
        const response = await fetch("/api/admin/delete-video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
          },
          body: JSON.stringify({
            filename,
            videoUrl: image.videoUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to delete video");
        }

        const data = await response.json();
        console.log(`[useImages] Video deleted successfully:`, data);

        // Update local state to remove video flag
        setImagesState((prev) =>
          prev.map((img) =>
            img.name === filename
              ? {
                  ...img,
                  isVideo: false,
                  videoUrl: undefined,
                  videoGeneratedAt: undefined,
                  videoDurationSeconds: undefined,
                }
              : img
          )
        );

        console.log(`[useImages] Video deleted for: ${filename}`);
        return { success: true };
      } catch (error) {
        console.error("[useImages] Delete video failed:", error);
        // Revert local state on error
        await refresh();
        throw error;
      }
    },
    [authToken, setImagesState, refresh]
  );

  const convertPdfToImages = useCallback(
    async (file: File) => {
      try {
        console.log(`[useImages] Converting PDF: ${file.name}`);
        
        // Check if we're in the browser
        if (typeof window === 'undefined') {
          throw new Error('PDF conversion can only run in browser');
        }
        
        // Dynamically import PDF.js (warnings suppressed in next.config.mjs)
        console.log('[useImages] Importing PDF.js library...');
        // @ts-ignore - Dynamic import of PDF.js
        const pdfjsLib = await import('pdfjs-dist');
        console.log('[useImages] PDF.js library imported successfully');
        
        // Set worker path - prefer `NEXT_PUBLIC_PDFJS_WORKER_URL` env var,
        // otherwise fall back to the matching version on unpkg so worker
        // code matches the installed `pdfjs-dist` package.
        const workerUrl = process.env.NEXT_PUBLIC_PDFJS_WORKER_URL || 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.js';
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        console.log('[useImages] Worker path set to', workerUrl);
        
        // Ensure window is defined (client-side)
        if (typeof window !== 'undefined') {
          (window as any).pdfjsLib = pdfjsLib;
        }
        
        // Read PDF file
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDoc = await loadingTask.promise;
        const pageCount = pdfDoc.numPages;
        
        console.log(`[useImages] PDF has ${pageCount} page(s)`);
        
        const baseFilename = file.name.replace(/\.pdf$/i, '');
        const uploadedImages: File[] = [];
        
        // Convert each page to image
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          console.log(`[useImages] Rendering page ${pageNum}/${pageCount}`);
          
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // High quality
          
          // Create canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
          if (!context) {
            throw new Error('Could not get canvas context');
          }
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          // Render page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          
          // Convert canvas to blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to create blob'));
            }, 'image/png');
          });
          
          // Create filename
          const imageFilename = pageCount > 1 
            ? `${baseFilename}-page-${pageNum}.png`
            : `${baseFilename}.png`;
          
          // Create File object
          const imageFile = new File([blob], imageFilename, { type: 'image/png' });
          uploadedImages.push(imageFile);
        }
        
        console.log(`[useImages] Converted ${uploadedImages.length} pages, uploading...`);
        
        // Upload all images
        const uploadResult = await uploadImages(uploadedImages);
        
        return {
          success: uploadResult.success,
          images: uploadedImages.map(f => f.name),
          pageCount: pageCount,
        };
        
      } catch (error) {
        console.error("[useImages] PDF conversion failed:", error);
        throw error;
      }
    },
    [uploadImages]
  );

  const saveMultipleMetadata = useCallback(
    async (filenames: string[]) => {
      if (!filenames.length) return false;

      const snapshot = imagesRef.current;
      const selectedImages = snapshot.filter(img => filenames.includes(img.name));

      const payload = selectedImages.map((image, index) => ({
        filename: image.name,
        durationMs: toMilliseconds(image.durationSeconds),
        caption: image.caption,
        order: snapshot.findIndex(img => img.name === image.name),
      }));

      console.log(`[useImages] saveMultipleMetadata: ${payload.length} items`);

      setIsSavingMetadata(true);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
        }

        const response = await fetch("/api/admin/metadata", {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        setImagesState((prev) =>
          prev.map((image) =>
            filenames.includes(image.name)
              ? {
                  ...image,
                  originalCaption: image.caption,
                  originalDurationSeconds: image.durationSeconds,
                }
              : image
          )
        );

        return true;
      } catch (error) {
        console.error("Failed to save multiple metadata:", error);
        return false;
      } finally {
        setIsSavingMetadata(false);
      }
    },
    [authToken, setImagesState]
  );

  return {
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
    updateMultipleMetadataDraft,
    resetMetadataDraft,
    saveMetadata,
    saveMultipleMetadata,
    reorderImages,
    generateVideo,
    generateBatchVideo,
    deleteVideo,
    renameImage,
    convertPdfToImages,
  };
};
