import type { NextApiRequest, NextApiResponse } from "next";
import { isAuthorizedAdminRequest } from "../../../lib/auth";
import { storage } from "../../../lib/storage-adapter";
import { db } from "../../../lib/db";
import { broadcast } from "../../../lib/websocket";
import fs from 'fs/promises';
import path from 'path';

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

  try {
    const oldPath = (storage as any).getImagePath(trimmedOldName);
    const newPath = (storage as any).getImagePath(trimmedNewName);

    await fs.rename(oldPath, newPath);

    let metadataUpdated = false;
    try {
      await db.updateImageDuration(trimmedOldName, { filename: trimmedNewName });
      metadataUpdated = true;
    } catch (dbError) {
        console.error("Failed to update metadata during rename:", dbError);
        // Attempt to clean up new file to avoid duplicates
        await fs.rename(newPath, oldPath);
        return res.status(500).json({ error: "Gagal memperbarui metadata gambar." });
    }

    // Broadcast image rename to refresh galleries
    try {
      broadcast(JSON.stringify({
        event: 'image-updated',
        payload: {
          action: 'renamed',
          oldName: trimmedOldName,
          newName: trimmedNewName,
          updatedAt: new Date().toISOString()
        }
      }));
      console.log(`[Rename] Broadcast: Renamed ${trimmedOldName} to ${trimmedNewName}`);
    } catch (broadcastError) {
      console.warn('[Rename] Failed to broadcast image rename:', broadcastError);
    }

    return res.status(200).json({ success: true, filename: trimmedNewName, previousName: trimmedOldName });
  } catch (error: any) {
    if (error.code === 'EEXIST') {
        return res.status(409).json({ error: "File dengan nama tersebut sudah ada." });
    }
    if (error.code === 'ENOENT') {
        return res.status(404).json({ error: "File lama tidak ditemukan." });
    }
    console.error("Unexpected error in rename-image API:", error);
    return res.status(500).json({ error: "Terjadi kesalahan saat rename gambar." });
  }
}
