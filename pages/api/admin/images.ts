import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { storage } from "../../../lib/storage-adapter";
import { isAuthorizedAdminRequest } from "../../../lib/auth";
import fs from 'fs/promises';
import path from 'path';

type AdminImage = {
  name: string;
  size: number;
  createdAt: string | null;
  updatedAt: string | null;
  durationMs: number | null;
  caption: string | null;
  hidden: boolean;
  isVideo?: boolean;
  videoUrl?: string;
  videoDurationSeconds?: number | null;
  videoGeneratedAt?: string;
  previewUrl?: string;
};

type Data =
  | { images: AdminImage[] }
  | { error: string };

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif",
]);

const isImageFile = (filename: string) => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return false;
  }
  const extension = filename.slice(lastDot).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const dbMetadata = await db.getImageDurations();
    const metadataMap = new Map(dbMetadata.map((row: any) => [row.filename, {
      duration_ms: row.duration_ms,
      caption: row.caption ?? null,
      order: row.order_index ?? 999,
      hidden: row.hidden ?? false,
      is_video: row.is_video ?? false,
      video_url: row.video_url ?? null,
      video_duration_seconds: row.video_duration_ms ? Math.round(row.video_duration_ms / 1000) : null,
      video_generated_at: row.video_generated_at ?? null,
    }]));

    const fileList = await storage.listImages();
    const videoList = await storage.listVideos();

    const videoMap = new Map<string, { url: string; size: number; createdAt: string | null }>();
    for (const video of videoList) {
      const videoUrl = storage.getVideoUrl(video);
      const videoPath = (storage as any).getVideoPath(video);
      const stats = await fs.stat(videoPath);
      videoMap.set(video, {
        url: videoUrl,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      });
    }

    let images: AdminImage[] = [];
    for (const file of fileList) {
        if (!isImageFile(file)) continue;

        const metadataEntry = metadataMap.get(file) || null;
        const imagePath = (storage as any).getImagePath(file);
        const stats = await fs.stat(imagePath);
        
        const videoName = file.replace(/\.[^/.]+$/, '.mp4');
        const videoData = videoMap.get(videoName);
        
        const hasVideo = (metadataEntry?.is_video ?? false) || videoData !== undefined;
        const videoUrl = metadataEntry?.video_url || videoData?.url || undefined;
        
        images.push({
          name: file,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          durationMs: metadataEntry?.duration_ms ?? null,
          caption: metadataEntry?.caption ?? null,
          hidden: metadataEntry?.hidden ?? false,
          isVideo: hasVideo,
          videoUrl: videoUrl,
          videoDurationSeconds: metadataEntry?.video_duration_seconds,
          videoGeneratedAt: (metadataEntry?.video_generated_at || videoData?.createdAt) ?? undefined,
        });
    }

    images.sort((a, b) => {
      const metaA = metadataMap.get(a.name);
      const metaB = metadataMap.get(b.name);
      const orderA = metaA?.order ?? 999999;
      const orderB = metaB?.order ?? 999999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.name.localeCompare(b.name);
    });

    const videoOnlyEntries: AdminImage[] = [];
    metadataMap.forEach((metadata, filename) => {
      if (metadata.is_video && metadata.video_url && (metadata.hidden || filename === 'dashboard.jpg')) {
        const imageInList = images.find(img => img.name === filename);
        if (!imageInList) {
          videoOnlyEntries.push({
            name: filename,
            size: 0,
            createdAt: null,
            updatedAt: metadata.video_generated_at || null,
            durationMs: metadata.duration_ms,
            caption: metadata.caption,
            hidden: metadata.hidden,
            isVideo: true,
            videoUrl: metadata.video_url,
            videoDurationSeconds: metadata.video_duration_seconds,
            videoGeneratedAt: metadata.video_generated_at,
            previewUrl: `/api/admin/thumbnail/${filename}?video=true`,
          });
        }
      }
    });

    images.push(...videoOnlyEntries);

    images.sort((a, b) => {
      const metaA = metadataMap.get(a.name);
      const metaB = metadataMap.get(b.name);
      const orderA = metaA?.order ?? 999999;
      const orderB = metaB?.order ?? 999999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({ images });
  } catch (error) {
    console.error("Error in GET /api/admin/images:", error);
    return res.status(500).json({ error: "Gagal memuat data admin." });
  }
}
