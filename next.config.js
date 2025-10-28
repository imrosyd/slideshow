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
  experimental: {
    outputFileTracingIncludes: {
      "/api/images": imageGlobs,
      "/api/image/[name]": imageGlobs
    }
  },
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

module.exports = nextConfig;
