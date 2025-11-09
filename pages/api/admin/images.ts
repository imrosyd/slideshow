import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../lib/auth";

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
  videoDurationSeconds?: number;
  videoGeneratedAt?: string;
  // Additional field for video-only entries
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

  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah: ADMIN_PASSWORD tidak diatur." });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
  const SUPABASE_DURATIONS_TABLE = process.env.SUPABASE_DURATIONS_TABLE;

  if (!SUPABASE_STORAGE_BUCKET) {
    console.error("SUPABASE_STORAGE_BUCKET is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
  }

  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const supabaseServiceRole = getSupabaseServiceRoleClient();

    // Load metadata from database
    const metadataMap = new Map<string, { 
      duration_ms: number; 
      caption: string | null; 
      order: number; 
      hidden: boolean;
      is_video?: boolean;
      video_url?: string;
      video_duration_seconds?: number;
      video_generated_at?: string;
    }>();
    
    // Try to load from database (with fallback if migration not run yet)
    const { data: dbMetadata, error: dbError } = await supabaseServiceRole
      .from('image_durations')
      .select('*');

    if (dbError) {
      console.error("[Admin Images] Database error:", dbError);
    } else if (dbMetadata) {
      dbMetadata.forEach((row: any) => {
        metadataMap.set(row.filename, {
          duration_ms: row.duration_ms,
          caption: row.caption ?? null,
          order: row.order_index ?? 999,
          hidden: row.hidden ?? false,
          is_video: row.is_video ?? false,
          video_url: row.video_url ?? null,
          video_duration_seconds: row.video_duration_seconds ?? null,
          video_generated_at: row.video_generated_at ?? null,
        });
      });
      console.log(`[Admin Images] Loaded ${metadataMap.size} metadata entries from database`);
      if (metadataMap.size > 0) {
        console.log(`[Admin Images] Sample entry: ${Array.from(metadataMap.entries())[0]?.[0]} hidden=${Array.from(metadataMap.entries())[0]?.[1]?.hidden}`);
      }
    }

    // List files from storage
    const { data: fileList, error: storageError } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (storageError) {
      console.error("Error listing files from Supabase Storage:", storageError);
      return res.status(500).json({ error: "Gagal membaca daftar file dari Supabase Storage." });
    }

    // Also list all videos from slideshow-videos bucket
    const { data: videoList, error: videoError } = await supabaseServiceRole.storage
      .from('slideshow-videos')
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (videoError) {
      console.warn("Error listing videos from Supabase Storage:", videoError);
    }

    // Create a map of videos by their corresponding image name
    const videoMap = new Map<string, { url: string; size: number; createdAt: string | null }>();
    if (videoList) {
      videoList.forEach((video) => {
        if (video.name && video.name.endsWith('.mp4')) {
          // Get corresponding image name (replace .mp4 with original extension)
          const imageName = video.name.replace('.mp4', '.jpg'); // Try .jpg first
          const { data: videoPublicData } = supabaseServiceRole.storage
            .from('slideshow-videos')
            .getPublicUrl(video.name);
          
          videoMap.set(video.name, {
            url: videoPublicData.publicUrl,
            size: video.metadata?.size ?? 0,
            createdAt: video.created_at ?? null,
          });
        }
      });
      console.log(`[Admin Images] Found ${videoMap.size} videos in storage`);
    }

    const images: AdminImage[] = (fileList ?? [])
      .filter((file) => file.name && file.name !== "" && file.id && isImageFile(file.name))
      .map((file) => {
        const metadataEntry = metadataMap.get(file.name) || null;
        const durationMs = metadataEntry?.duration_ms ?? null;
        
        // Check if video exists in storage for this image
        const videoName = file.name.replace(/\.[^/.]+$/, '.mp4');
        const videoData = videoMap.get(videoName);
        
        // Use video from storage if exists, otherwise use metadata
        const hasVideo = videoData !== undefined || (metadataEntry?.is_video ?? false);
        const videoUrl = videoData?.url || metadataEntry?.video_url || undefined;
        
        return {
          name: file.name,
          size: file.metadata?.size ?? 0,
          createdAt: file.created_at ?? null,
          updatedAt: file.updated_at ?? null,
          durationMs,
          caption: metadataEntry?.caption ?? null,
          hidden: metadataEntry?.hidden ?? false,
          isVideo: hasVideo,
          videoUrl: videoUrl,
          videoDurationSeconds: metadataEntry?.video_duration_seconds ?? undefined,
          videoGeneratedAt: (videoData?.createdAt || metadataEntry?.video_generated_at) ?? undefined,
        };
      });

    // Sort images based on order_index from database
    images.sort((a, b) => {
      const metaA = metadataMap.get(a.name);
      const metaB = metadataMap.get(b.name);
      const orderA = metaA?.order ?? 999999;
      const orderB = metaB?.order ?? 999999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Same order, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    // Add videos that exist only in database (like merge videos without placeholder images)
    const videoOnlyEntries: AdminImage[] = [];
    metadataMap.forEach((metadata, filename) => {
      // Check if this is a video with URL but not already in the images list
      if (metadata.is_video && metadata.video_url && metadata.hidden) {
        const imageInList = images.find(img => img.name === filename);
        if (!imageInList) {
          console.log(`[Admin Images] Adding video-only entry: ${filename}`);
          videoOnlyEntries.push({
            name: filename,
            size: 0, // No image file
            createdAt: null, // No image file
            updatedAt: metadata.video_generated_at || null,
            durationMs: metadata.duration_ms,
            caption: metadata.caption,
            hidden: metadata.hidden,
            isVideo: true,
            videoUrl: metadata.video_url,
            videoDurationSeconds: metadata.video_duration_seconds,
            videoGeneratedAt: metadata.video_generated_at,
            previewUrl: `/api/admin/thumbnail/${filename}?video=true`, // Special URL for video thumbnail
          });
        }
      }
    });

    // Add video-only entries to the images list
    images.push(...videoOnlyEntries);

    // Sort again to include new entries
    images.sort((a, b) => {
      const metaA = metadataMap.get(a.name);
      const metaB = metadataMap.get(b.name);
      const orderA = metaA?.order ?? 999999;
      const orderB = metaB?.order ?? 999999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Same order, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    console.log("[Admin Images] Total images returned:", images.length);
    console.log("[Admin Images] Images with duration:", images.filter(i => i.durationMs !== null).length);
    console.log("[Admin Images] Hidden images:", images.filter(i => i.hidden).length);

    return res.status(200).json({ images });
  } catch (error) {
    console.error("Error in GET /api/admin/images:", error);
    return res.status(500).json({ error: "Gagal memuat data admin." });
  }
}
