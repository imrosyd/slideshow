import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import type { File as FormidableFile } from "formidable";
import { promises as fs } from "fs";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";
import { isAuthorizedAdminRequest } from "../../../lib/auth";

const MUSIC_BUCKET = "slideshow-music";

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "50mb", // Allow larger music files
  },
};

type SuccessResponse = {
  success: true;
  url: string;
  filename: string;
};

type ErrorResponse = {
  success: false;
  error: string;
};

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (req.method === "POST") {
    // Upload music file
    const form = formidable({
      multiples: false,
      maxFileSize: 50 * 1024 * 1024, // 50 MB
    });

    try {
      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
        (resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve([fields, files]);
          });
        }
      );

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      
      if (!file || !file.originalFilename) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      // Validate file type (audio files only)
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
      if (!allowedTypes.includes(file.mimetype || '')) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid file type. Only audio files are allowed (MP3, WAV, OGG, AAC)" 
        });
      }

      const sanitizedFilename = sanitizeFilename(file.originalFilename);
      const supabase = getSupabaseServiceRoleClient();

      // Read file buffer
      const fileBuffer = await fs.readFile(file.filepath);

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from(MUSIC_BUCKET)
        .upload(sanitizedFilename, fileBuffer, {
          contentType: file.mimetype || 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return res.status(500).json({ 
          success: false, 
          error: `Failed to upload: ${uploadError.message}` 
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(MUSIC_BUCKET)
        .getPublicUrl(sanitizedFilename);

      console.log('[Music API] File uploaded, public URL:', urlData.publicUrl);

      // Update music_file_url setting
      const { error: dbError } = await supabase
        .from('slideshow_settings')
        .upsert({
          key: 'music_file_url',
          value: urlData.publicUrl,
        }, {
          onConflict: 'key'
        });

      if (dbError) {
        console.error("[Music API] Database error:", dbError);
      } else {
        console.log('[Music API] Database updated with music_file_url');
      }

      console.log('[Music API] Upload complete, returning response');
      return res.status(200).json({
        success: true,
        url: urlData.publicUrl,
        filename: sanitizedFilename,
      });

    } catch (error) {
      console.error("Error uploading music:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to upload music file" 
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete current music file
    try {
      const supabase = getSupabaseServiceRoleClient();

      // Get current music file URL
      const { data: setting, error: fetchError } = await supabase
        .from('slideshow_settings')
        .select('value')
        .eq('key', 'music_file_url')
        .single();

      if (fetchError || !setting?.value) {
        return res.status(404).json({ success: false, error: "No music file found" });
      }

      // Extract filename from URL
      const url = setting.value;
      const filename = url.split('/').pop();

      if (!filename) {
        return res.status(400).json({ success: false, error: "Invalid file URL" });
      }

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(MUSIC_BUCKET)
        .remove([filename]);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return res.status(500).json({ 
          success: false, 
          error: `Failed to delete: ${deleteError.message}` 
        });
      }

      // Clear music_file_url setting
      await supabase
        .from('slideshow_settings')
        .upsert({
          key: 'music_file_url',
          value: '',
        }, {
          onConflict: 'key'
        });

      return res.status(200).json({
        success: true,
        url: '',
        filename: '',
      });

    } catch (error) {
      console.error("Error deleting music:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to delete music file" 
      });
    }
  }

  res.setHeader("Allow", ["POST", "DELETE"]);
  return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
}
