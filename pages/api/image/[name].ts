import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fsPromises, createReadStream } from "fs";
import path from "path";
import mime from "mime-types";

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif"
]);

async function resolveFilePath(filename: string): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), filename);
    const stats = await fsPromises.stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    return filePath;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (typeof name !== "string") {
    res.status(400).json({ error: "Nama file tidak valid." });
    return;
  }

  const filename = path.basename(name);
  const extension = path.extname(filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    res.status(404).json({ error: "Format file tidak didukung." });
    return;
  }

  const filePath = await resolveFilePath(filename);
  if (!filePath) {
    res.status(404).json({ error: "Gambar tidak ditemukan." });
    return;
  }

  const mimeType = mime.lookup(extension) || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=60");

  const stream = createReadStream(filePath);

  await new Promise<void>((resolve, reject) => {
    stream.on("error", (err) => {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).end("Gagal membaca file gambar.");
      } else {
        res.end();
      }
      reject(err);
    });
    stream.on("end", () => {
      resolve();
    });
    stream.pipe(res);
  });
}
