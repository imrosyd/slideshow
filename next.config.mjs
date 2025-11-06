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
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
