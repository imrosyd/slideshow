const imageGlobs = [
  "./*.png",
  "./*.jpg",
  "./*.jpeg",
  "./*.gif",
  "./*.webp",
  "./*.bmp",
  "./*.svg",
  "./*.avif"
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable image optimization to preserve original quality
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/images": imageGlobs,
      "/api/image/[name]": imageGlobs
    }
  },
};

module.exports = nextConfig;
