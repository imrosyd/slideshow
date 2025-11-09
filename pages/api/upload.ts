import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import type { File as FormidableFile, Files, Fields } from "formidable";
import { promises as fs } from "fs";
import { getSupabaseServiceRoleClient } from "../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../lib/auth";

const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "25mb",
  },
};

type SuccessResponse = {
  message: string;
  filenames?: string[];
  failed?: string[];
};

type ErrorResponse = {
  error: string;
};

// Simple filename sanitizer
const sanitizeFilename = (filename: string): string => {
  // Supabase storage doesn't like certain characters, replace them
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
};

// Limit simultaneous storage writes to avoid timeouts while keeping throughput high.
const MAX_CONCURRENT_UPLOADS = 5;

const parseForm = (req: NextApiRequest, form: ReturnType<typeof formidable>) =>
  new Promise<Files>((resolve, reject) => {
    form.parse(req, (err: any, _fields: Fields, files: Files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(files);
    });
  });

const uploadSingleFile = async (file: FormidableFile, bucket: string) => {
  const originalFilename = file.originalFilename;
  if (!originalFilename) {
    throw new Error("File tidak memiliki nama asli.");
  }

  const sanitizedFilename = sanitizeFilename(originalFilename);
  const supabaseServiceRole = getSupabaseServiceRoleClient();
  const fileBuffer = await fs.readFile(file.filepath); // Read file into memory to avoid Node fetch duplex issues
  const { error } = await supabaseServiceRole.storage
    .from(bucket)
    .upload(sanitizedFilename, fileBuffer, {
      contentType: file.mimetype || undefined,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || "Gagal mengunggah ke Supabase.");
  }

  return sanitizedFilename;
};

const handlePostRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) => {
  const form = formidable({
    multiples: true,
    maxFileSize: 25 * 1024 * 1024, // 25 MB per file
    maxTotalFileSize: 100 * 1024 * 1024, // 100 MB total per request
  });

  try {
    const files = await parseForm(req, form);

    const uploadedFiles = Array.isArray(files.file)
      ? (files.file as FormidableFile[])
      : files.file
        ? [files.file as FormidableFile]
        : [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: "Tidak ada file yang ditemukan untuk diunggah." });
    }

    if (!SUPABASE_STORAGE_BUCKET) {
      console.error("SUPABASE_STORAGE_BUCKET is not set.");
      return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
    }

    const successfulUploads: string[] = [];
    const uploadErrors: string[] = [];

    let index = 0;
    const worker = async () => {
      while (index < uploadedFiles.length) {
        const currentIndex = index;
        index += 1;
        const file = uploadedFiles[currentIndex];
        try {
          const name = await uploadSingleFile(file, SUPABASE_STORAGE_BUCKET);
          successfulUploads.push(name);
        } catch (uploadErr: any) {
          const message = uploadErr?.message || "Gagal mengunggah file.";
          console.error(`Error processing file ${file.originalFilename}:`, uploadErr);
          uploadErrors.push(`${file.originalFilename || "(tanpa nama)"}: ${message}`);
        } finally {
          if (file.filepath) {
            try {
              await fs.unlink(file.filepath);
            } catch (cleanupErr) {
              console.error("Error deleting temp file:", cleanupErr);
            }
          }
        }
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, uploadedFiles.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (successfulUploads.length === 0) {
      const combinedError = uploadErrors.join("; ") || "Tidak ada file yang berhasil diunggah ke Supabase.";
      return res.status(500).json({ error: combinedError });
    }

    if (uploadErrors.length > 0) {
      return res.status(207).json({
        message: `${successfulUploads.length} file berhasil diunggah, tetapi ${uploadErrors.length} gagal.`,
        filenames: successfulUploads,
        failed: uploadErrors,
      });
    }

    return res.status(200).json({
      message: `${successfulUploads.length} file berhasil diunggah ke Supabase.`,
      filenames: successfulUploads,
    });
  } catch (err) {
    console.error("Error parsing form:", err);
    return res.status(500).json({ error: "Gagal memproses unggahan." });
  }
};

const handleDeleteRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) => {
  try {
    const { filenames } = req.body; // Expect an array of filenames

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: "Daftar nama file diperlukan." });
    }

    if (!SUPABASE_STORAGE_BUCKET) {
      console.error("SUPABASE_STORAGE_BUCKET is not set.");
      return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
    }

    const sanitizedFilenames = filenames.map(sanitizeFilename);
    const supabaseServiceRole = getSupabaseServiceRoleClient();
    
    // Step 1: Delete images from storage (may not exist for merged video placeholders)
    let deletedCount = 0;
    try {
      const { data, error: deleteError } = await supabaseServiceRole.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .remove(sanitizedFilenames);

      if (deleteError) {
        console.warn("Warning deleting files from storage (this is OK for merged videos):", deleteError);
        // Don't fail the request - continue to delete metadata
      } else {
        deletedCount = data?.length || 0;
        console.log(`[Delete] Successfully deleted ${deletedCount} files from storage`);
      }
    } catch (storageError) {
      console.warn("Storage deletion error (continuing with metadata):", storageError);
    }

    // Step 2: Delete associated videos from storage
    const videoFilenames = sanitizedFilenames.map(filename => {
      const ext = filename.lastIndexOf('.');
      if (ext > 0) {
        return filename.substring(0, ext) + '.mp4';
      }
      return filename + '.mp4';
    });

    // Try to delete videos (don't fail if they don't exist)
    try {
      await supabaseServiceRole.storage
        .from('slideshow-videos')
        .remove(videoFilenames);
    } catch (videoError) {
      console.log('No videos to delete or error deleting videos:', videoError);
    }

    // Step 3: Check if any of these items have associated videos and delete them too
    try {
      const { data: videoList } = await supabaseServiceRole.storage
        .from('slideshow-videos')
        .list('', { limit: 1000 });

      if (videoList) {
        const associatedVideosToDelete: string[] = [];
        
        sanitizedFilenames.forEach(filename => {
          // Convert image name to expected video name
          const videoName = filename.replace(/\.[^/.]+$/, '.mp4');
          
          if (videoList.some(v => v.name === videoName)) {
            associatedVideosToDelete.push(videoName);
          }
        });

        if (associatedVideosToDelete.length > 0) {
          console.log(`[Delete] Found ${associatedVideosToDelete.length} associated videos to delete`);
          
          const { error: videoDeleteError } = await supabaseServiceRole.storage
            .from('slideshow-videos')
            .remove(associatedVideosToDelete);

          if (videoDeleteError) {
            console.warn('Warning deleting associated videos:', videoDeleteError);
          } else {
            console.log(`[Delete] ✅ Deleted ${associatedVideosToDelete.length} associated videos`);
          }
        }
      }
    } catch (videoCheckError) {
      console.warn('Error checking for associated videos:', videoCheckError);
    }

    // Step 4: Delete metadata from database
    try {
      const { error: dbError } = await supabaseServiceRole
        .from('image_durations')
        .delete()
        .in('filename', sanitizedFilenames);

      if (dbError) {
        console.error('Error deleting metadata from database:', dbError);
        // Don't fail the request, just log the error
      }
    } catch (dbError) {
      console.error('Error deleting from database:', dbError);
    }

    // Broadcast image deletion to refresh galleries
    if (deletedCount > 0 || metadataDeleted) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const channel = supabase.channel('image-metadata-updates');
        await channel.send({
          type: 'broadcast',
          event: 'image-updated',
          payload: {
            action: 'deleted',
            deletedCount: deletedCount,
            updatedAt: new Date().toISOString()
          }
        }, { httpSend: true });
        console.log(`[Delete] Broadcast: Deleted ${deletedCount} images`);
      } catch (broadcastError) {
        console.warn('[Delete] Failed to broadcast image deletion:', broadcastError);
      }
    }

    // Check if metadata was actually deleted
    let metadataDeleted = false;
    try {
      const { data: checkData } = await supabaseServiceRole
        .from('image_durations')
        .select('filename')
        .in('filename', sanitizedFilenames);
      
      metadataDeleted = !checkData || checkData.length === 0;
    } catch (checkError) {
      console.warn('Error checking metadata deletion:', checkError);
    }

    let message = '';
    if (deletedCount > 0 && metadataDeleted) {
      message = `${deletedCount} file berhasil dihapus dari Supabase dan metadata.`;
    } else if (deletedCount > 0) {
      message = `${deletedCount} file berhasil dihapus dari Supabase.`;
    } else if (metadataDeleted) {
      message = `Metadata berhasil dihapus untuk ${sanitizedFilenames.length} item tanpa file.`;
    } else {
      message = `File atau metadata tidak ditemukan.`;
    }

    res.status(200).json({ message, filenames: sanitizedFilenames });
  } catch (err: any) {
    console.error("Error in handleDeleteRequest:", err);
    res.status(500).json({ error: "Gagal menghapus file." });
  }
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah: ADMIN_PASSWORD tidak diatur." });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  if (req.method === "POST") {
    return await handlePostRequest(req, res);
  }

  if (req.method === "DELETE") {
    // a bit of a hack to get body parsing since we disabled the default one
     const chunks: any[] = [];
     req.on('data', chunk => chunks.push(chunk));
     req.on('end', async () => {
         const body = Buffer.concat(chunks).toString('utf8');
         try {
            req.body = body ? JSON.parse(body) : {};
         } catch(e) {
            req.body = {};
         }
         return await handleDeleteRequest(req, res);
     });
     return;
  }

  res.setHeader("Allow", ["POST", "DELETE"]);
  res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
}
