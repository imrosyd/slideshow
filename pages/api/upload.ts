import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fs } from "fs"; // Keep fs for reading temp file
import { supabaseServiceRole } from "../../lib/supabase";

const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "100mb",
  },
};

type SuccessResponse = {
  message: string;
  filenames?: string[];
};

type ErrorResponse = {
  error: string;
};

// Simple filename sanitizer
const sanitizeFilename = (filename: string): string => {
  // Supabase storage doesn't like certain characters, replace them
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
};

const handlePostRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) => {
  const form = formidable({
    multiples: true,
    maxFileSize: 100 * 1024 * 1024, // 100 MB per file
    maxTotalFileSize: 500 * 1024 * 1024, // 500 MB total per request
  });
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Gagal memproses unggahan." });
    }

    const uploadedFiles = Array.isArray(files.file)
      ? (files.file as formidable.File[])
      : files.file
        ? [files.file as formidable.File]
        : [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: "Tidak ada file yang ditemukan untuk diunggah." });
    }

    if (!SUPABASE_STORAGE_BUCKET) {
      console.error("SUPABASE_STORAGE_BUCKET is not set.");
      return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
    }

    const uploadedFilenames: string[] = [];
    for (const file of uploadedFiles as formidable.File[]) {
      const originalFilename = file.originalFilename;
      if (!originalFilename) {
        console.warn("File tanpa nama asli dilewati.");
        continue;
      }

      const sanitizedFilename = sanitizeFilename(originalFilename);
      
      try {
        const fileContent = await fs.readFile(file.filepath);
        const { data, error: uploadError } = await supabaseServiceRole.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .upload(sanitizedFilename, fileContent, {
            contentType: file.mimetype || undefined,
            upsert: true, // Overwrite if file exists
          });

        if (uploadError) {
          console.error(`Error uploading ${sanitizedFilename} to Supabase:`, uploadError);
          // Continue with other files even if one fails
        } else {
          uploadedFilenames.push(sanitizedFilename);
        }
      } catch (uploadErr) {
        console.error(`Error processing file ${originalFilename}:`, uploadErr);
        // Continue with other files even if one fails
      } finally {
        // Clean up the temporary file
        try { await fs.unlink(file.filepath); } catch (e) { console.error("Error deleting temp file:", e); }
      }
    }

    if (uploadedFilenames.length === 0) {
        return res.status(500).json({ error: "Tidak ada file yang berhasil diunggah ke Supabase." });
    }

    res.status(200).json({ message: `${uploadedFilenames.length} file berhasil diunggah ke Supabase.`, filenames: uploadedFilenames });
  });
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
    const { data, error: deleteError } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove(sanitizedFilenames);

    if (deleteError) {
      console.error("Error deleting files from Supabase:", deleteError);
      return res.status(500).json({ error: "Gagal menghapus file dari Supabase." });
    }

    const deletedCount = data?.length || 0;
    if (deletedCount === 0) {
        return res.status(404).json({ error: "Tidak ada file yang ditemukan atau dihapus di Supabase." });
    }

    res.status(200).json({ message: `${deletedCount} file berhasil dihapus dari Supabase.`, filenames: sanitizedFilenames });
  } catch (err: any) {
    console.error("Error in handleDeleteRequest:", err);
    res.status(500).json({ error: "Gagal menghapus file." });
  }
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah: ADMIN_PASSWORD tidak diatur." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
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
