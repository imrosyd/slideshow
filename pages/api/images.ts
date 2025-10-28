import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".avif"
]);

const EXCLUDED_FILES = new Set([
  ".DS_Store",
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml"
]);

type Data =
  | { images: string[] }
  | { error: string };

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const cwd = process.cwd();
    const dirEntries = fs.readdirSync(cwd, { withFileTypes: true });

    const images = dirEntries
      .filter((entry) => {
        if (!entry.isFile()) {
          return false;
        }

        if (EXCLUDED_FILES.has(entry.name)) {
          return false;
        }

        const extension = path.extname(entry.name).toLowerCase();
        return IMAGE_EXTENSIONS.has(extension);
      })
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "id"));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ images });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Tidak dapat membaca daftar gambar dari folder root." });
  }
}
