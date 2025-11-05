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
  caption: string;
  originalDurationSeconds: number | null;
  originalCaption: string;
  previewUrl: string;
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
        const caption = item.caption ?? "";
        return {
          name: item.name,
          size: item.size ?? 0,
          createdAt: item.createdAt ?? null,
          updatedAt: item.updatedAt ?? null,
          durationSeconds,
          caption,
          originalDurationSeconds: durationSeconds,
          originalCaption: caption,
          previewUrl: buildPreviewUrl(item.name),
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
        return false;
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
        }

        const response = await fetch("/api/upload", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ filenames }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        setImagesState((prev) =>
          prev.filter((image) => !filenames.includes(image.name))
        );
        return true;
      } catch (error) {
        console.error("Failed to delete image:", error);
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
        
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
        }

        const response = await fetch("/api/admin/generate-video", {
          method: "POST",
          headers,
          body: JSON.stringify({
            filename,
            durationSeconds,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Video generation failed");
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
    resetMetadataDraft,
    saveMetadata,
    reorderImages,
    generateVideo,
    generateBatchVideo,
    deleteVideo,
    renameImage,
  };
};
