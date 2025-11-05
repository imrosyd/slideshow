import type { NextApiRequest, NextApiResponse } from "next";
import { isAuthorizedAdminRequest } from "../../../lib/auth";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase";

type RenameResponse =
  | { success: true; filename: string; previousName: string }
  | { error: string };

const getExtension = (filename: string) => {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RenameResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  if (!isAuthorizedAdminRequest(req)) {
    return res.status(401).json({ error: "Akses ditolak." });
  }

  const { oldName, newName } = req.body ?? {};

  if (typeof oldName !== "string" || typeof newName !== "string") {
    return res.status(400).json({ error: "Parameter rename tidak valid." });
  }

  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  if (!trimmedOldName || !trimmedNewName) {
    return res.status(400).json({ error: "Nama file tidak boleh kosong." });
  }

  if (trimmedOldName === trimmedNewName) {
    return res.status(200).json({ success: true, filename: trimmedOldName, previousName: trimmedOldName });
  }

  if (trimmedNewName.includes("/") || trimmedNewName.includes("\\")) {
    return res.status(400).json({ error: "Nama file baru tidak boleh mengandung path." });
  }

  if (getExtension(trimmedOldName) !== getExtension(trimmedNewName)) {
    return res.status(400).json({ error: "Ekstensi file harus sama saat melakukan rename." });
  }

  const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

  if (!SUPABASE_STORAGE_BUCKET) {
    console.error("SUPABASE_STORAGE_BUCKET is not set.");
    return res.status(500).json({ error: "Konfigurasi server salah: Supabase bucket tidak diatur." });
  }

  try {
    const supabaseServiceRole = getSupabaseServiceRoleClient();

    const timestamp = new Date().toISOString();

    // Copy file to new name (no overwrite)
    const { error: copyError } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .copy(trimmedOldName, trimmedNewName, { upsert: false } as any);

    if (copyError) {
      console.error("Failed to copy file during rename:", copyError);
      const message = typeof copyError.message === "string" ? copyError.message.toLowerCase() : "";
      const isConflict = message.includes("exists") || message.includes("duplicate");
      return res.status(isConflict ? 409 : 500).json({
        error: isConflict ? "File dengan nama tersebut sudah ada." : "Gagal menyalin file ke nama baru.",
      });
    }

    let metadataUpdated = false;

    // Update metadata row if exists
    const { data: updateResult, error: updateError } = await supabaseServiceRole
      .from("image_durations")
      .update({ filename: trimmedNewName, updated_at: timestamp })
      .eq("filename", trimmedOldName)
      .select("filename");

    if (updateError) {
      console.error("Failed to update metadata during rename:", updateError);
      // Attempt to clean up new file to avoid duplicates
      await supabaseServiceRole.storage.from(SUPABASE_STORAGE_BUCKET).remove([trimmedNewName]);
      return res.status(500).json({ error: "Gagal memperbarui metadata gambar." });
    }

    metadataUpdated = Boolean(updateResult && updateResult.length > 0);

    // Remove old file after successful copy and metadata update
    const { error: removeError } = await supabaseServiceRole.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove([trimmedOldName]);

    if (removeError) {
      console.error("Failed to remove old file after rename:", removeError);
      // Try to roll back metadata if we updated it
      if (metadataUpdated) {
        await supabaseServiceRole
          .from("image_durations")
          .update({ filename: trimmedOldName, updated_at: new Date().toISOString() })
          .eq("filename", trimmedNewName);
      }
      return res.status(500).json({ error: "Gagal menghapus file lama setelah rename." });
    }

    return res.status(200).json({ success: true, filename: trimmedNewName, previousName: trimmedOldName });
  } catch (error) {
    console.error("Unexpected error in rename-image API:", error);
    return res.status(500).json({ error: "Terjadi kesalahan saat rename gambar." });
  }
}
