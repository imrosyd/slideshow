import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
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

const CACHE_TTL_MS = 5_000;

type Data =
  | { images: string[] }
  | { error: string };

type CacheEntry = {
  images: string[];
  expiresAt: number;
};

let cache: CacheEntry | null = null;

async function readImageList(): Promise<string[]> {
  const cwd = process.cwd();
  const dirEntries = await fs.readdir(cwd, { withFileTypes: true });

  return dirEntries
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
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
      res.setHeader("Cache-Control", "public, max-age=5, stale-while-revalidate=30");
      res.status(200).json({ images: cache.images.slice() });
      return;
    }

    const images = await readImageList();
    cache = {
      images,
      expiresAt: now + CACHE_TTL_MS
    };

    res.setHeader("Cache-Control", "public, max-age=5, stale-while-revalidate=30");
    res.status(200).json({ images: images.slice() });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Tidak dapat membaca daftar gambar dari folder root." });
  }
}
