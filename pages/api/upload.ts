import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import type { File as FormidableFile, Files, Fields } from "formidable";
import { promises as fs } from "fs";
import { storage } from "../../lib/storage-adapter";
import { db } from "../../lib/db";
import { broadcast } from "../../lib/websocket";
import { isAuthorizedAdminRequest } from "../../lib/auth";

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

const uploadSingleFile = async (file: FormidableFile) => {
  const originalFilename = file.originalFilename;
  if (!originalFilename) {
    throw new Error("File tidak memiliki nama asli.");
  }

  const sanitizedFilename = sanitizeFilename(originalFilename);
  const fileBuffer = await fs.readFile(file.filepath);
  await storage.uploadImage(sanitizedFilename, fileBuffer);

  // Create a database entry for the new image
  await db.upsertImageDuration({
    filename: sanitizedFilename,
    duration_ms: 5000, // Default duration
  });

  return sanitizedFilename;
};

const handlePostRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) => {
  console.log('[Upload] handlePostRequest: Entered');
  const form = formidable({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024,
    maxTotalFileSize: 50 * 1024 * 1024,
  });

  try {
    const files = await parseForm(req, form);
    console.log('[Upload] handlePostRequest: Form parsed, files:', Object.keys(files));

    const uploadedFiles = Array.isArray(files.file)
      ? (files.file as FormidableFile[])
      : files.file
        ? [files.file as FormidableFile]
        : [];

    if (uploadedFiles.length === 0) {
      console.log('[Upload] handlePostRequest: No files found');
      return res.status(400).json({ error: "Tidak ada file yang ditemukan untuk diunggah." });
    }
    console.log(`[Upload] handlePostRequest: Found ${uploadedFiles.length} files to process`);

    const successfulUploads: string[] = [];
    const uploadErrors: string[] = [];

    let index = 0;
    const worker = async () => {
      while (index < uploadedFiles.length) {
        const currentIndex = index;
        index += 1;
        const file = uploadedFiles[currentIndex];
        try {
          const name = await uploadSingleFile(file);
          console.log(`[Upload] handlePostRequest: Successfully uploaded ${name}`);
          successfulUploads.push(name);
        } catch (uploadErr: any) {
          const message = uploadErr?.message || "Gagal mengunggah file.";
          console.error(`[Upload] handlePostRequest: Error processing file ${file.originalFilename}:`, uploadErr);
          uploadErrors.push(`${file.originalFilename || "(tanpa nama)"}: ${message}`);
        } finally {
          if (file.filepath) {
            try {
              await fs.unlink(file.filepath);
            } catch (cleanupErr) {
              console.error("[Upload] handlePostRequest: Error deleting temp file:", cleanupErr);
            }
          }
        }
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, uploadedFiles.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    console.log(`[Upload] handlePostRequest: Finished processing. Success: ${successfulUploads.length}, Errors: ${uploadErrors.length}`);

    if (successfulUploads.length === 0) {
      const combinedError = uploadErrors.join("; ") || "Tidak ada file yang berhasil diunggah.";
      console.log(`[Upload] handlePostRequest: No files uploaded successfully. Errors: ${combinedError}`);
      return res.status(500).json({ error: combinedError });
    }

    if (successfulUploads.length > 0) {
      try {
        broadcast(JSON.stringify({
          event: 'image-updated',
          payload: {
            action: 'uploaded',
            uploadedCount: successfulUploads.length,
            filenames: successfulUploads,
            updatedAt: new Date().toISOString()
          }
        }));
        console.log(`[Upload] Broadcast: Uploaded ${successfulUploads.length} images`);
      } catch (broadcastError) {
        console.warn('[Upload] Failed to broadcast image upload:', broadcastError);
      }
    }

    if (uploadErrors.length > 0) {
      console.log(`[Upload] handlePostRequest: Partial success. ${successfulUploads.length} succeeded, ${uploadErrors.length} failed.`);
      return res.status(207).json({
        message: `${successfulUploads.length} file berhasil diunggah, tetapi ${uploadErrors.length} gagal.`,
        filenames: successfulUploads,
        failed: uploadErrors,
      });
    }

    console.log(`[Upload] handlePostRequest: All files uploaded successfully.`);
    return res.status(200).json({
      message: `${successfulUploads.length} file berhasil diunggah.`,
      filenames: successfulUploads,
    });
  } catch (err) {
    console.error("[Upload] handlePostRequest: Error parsing form:", err);
    return res.status(500).json({ error: "Gagal memproses unggahan." });
  }
};

const handleDeleteRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) => {
  try {
    const { filenames } = req.body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: "Daftar nama file diperlukan." });
    }

    const sanitizedFilenames = filenames.map(sanitizeFilename);
    let deletedCount = 0;

    for (const filename of sanitizedFilenames) {
      try {
        await storage.deleteImage(filename);
        deletedCount++;
      } catch (storageError) {
        console.warn(`Warning deleting file ${filename} from storage:`, storageError);
      }

      const videoFilename = filename.replace(/\.[^/.]+$/, '.mp4');
      try {
        await storage.deleteVideo(videoFilename);
      } catch (videoError) {
        console.log(`No video to delete for ${filename} or error deleting video:`, videoError);
      }

      try {
        await db.deleteImageDuration(filename);
      } catch (dbError) {
        console.error(`Error deleting metadata for ${filename} from database:`, dbError);
      }
    }

    if (deletedCount > 0) {
      try {
        broadcast(JSON.stringify({
          event: 'image-updated',
          payload: {
            action: 'deleted',
            deletedCount: deletedCount,
            updatedAt: new Date().toISOString()
          }
        }));
        console.log(`[Delete] Broadcast: Deleted ${deletedCount} images`);
      } catch (broadcastError) {
        console.warn('[Delete] Failed to broadcast image deletion:', broadcastError);
      }
    }

    res.status(200).json({ message: `${deletedCount} file berhasil dihapus.`, filenames: sanitizedFilenames });
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
