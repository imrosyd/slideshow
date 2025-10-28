import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const filePath = path.join(process.cwd(), filename);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.status(404).json({ error: "Gambar tidak ditemukan." });
    return;
  }

  const mimeType = mime.lookup(extension) || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=60");

  const stream = fs.createReadStream(filePath);
  stream.on("error", (err) => {
    console.error(err);
    res.status(500).end("Gagal membaca file gambar.");
  });
  stream.pipe(res);
}
