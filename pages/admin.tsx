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
  } = useImages(authToken);

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

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white touch-auto select-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25)_0,_transparent_55%)]"></div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.2)_0,_transparent_60%)]"></div>
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-[0.2em] text-white/60">Admin dashboard</span>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Slideshow Control Center</h1>
            <p className="max-w-3xl text-sm text-white/60">
              Manage your slideshow collection with a modern control panel: upload new images, fine-tune metadata, and monitor status in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-white/70">
              {galleryStats.total} images
            </span>
            <span className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-white/70">
              {galleryStats.formattedSize}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => refresh()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10"
              >
                ↻ Refresh
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Signing out…" : "Logout"}
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-8 lg:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
              <h2 className="mb-4 text-lg font-semibold text-white">Upload images</h2>
              <UploadBox isUploading={isUploading} uploadTasks={uploadTasks} onFilesSelected={handleUpload} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass">
              <h2 className="text-lg font-semibold text-white">Metadata</h2>
              <p className="mt-2 text-sm text-white/60">
                Set a custom duration per slide and add captions that will be displayed on the slideshow screen.
              </p>
              <button
                type="button"
                onClick={handleSaveMetadata}
                disabled={dirtyCount === 0 || isSavingMetadata}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingMetadata ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount > 1 ? "s" : ""}` : "No pending changes"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Image Gallery</h2>
              {isLoading && <span className="text-xs tracking-wide text-white/60">Loading…</span>}
            </div>
            {images.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/5 text-center text-white/60">
                <span className="text-2xl">🌌</span>
                <p className="max-w-sm text-sm">No images uploaded yet. Start by adding files through the upload panel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {images.map((image) => (
                  <ImageCard
                    key={image.name}
                    image={image}
                    onChange={updateMetadataDraft}
                    onReset={resetMetadataDraft}
                    onDelete={(filename) => setConfirmTarget(filename)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title="Delete this image?"
        description={confirmTarget ? `Image ${confirmTarget} will be permanently removed from storage.` : ""}
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
