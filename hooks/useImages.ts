import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [images, setImages] = useState<ImageAsset[]>([]);
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
      });

      if (!response.ok) {
        throw new Error(await response.text());
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
        } as ImageAsset;
      });

      setImages(fetched);
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

        setImages((prev) =>
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
      setImages((prev) =>
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
    setImages((prev) =>
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
    const payload = images.map((image) => ({
      filename: image.name,
      durationMs: toMilliseconds(image.durationSeconds),
      caption: image.caption,
    }));

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

      setImages((prev) =>
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
  }, [authToken, images]);

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
    setImages((prev) => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  }, []);

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
  };
};
