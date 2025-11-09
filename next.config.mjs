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
  webpack: (config, { dev }) => {
    if (dev) {
      // Optimize HMR for development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Suppress specific warnings for pdfjs-dist
    config.ignoreWarnings = [
      {
        module: /node_modules\/pdfjs-dist/,
        message: /The generated code contains 'async\/await'/,
      },
    ];
    
    // Fix PDF.js loading for webpack 5
    
    // Configure module rules for PDF.js 
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
      include: /node_modules[\/\\]pdfjs-dist/,
      type: 'javascript/auto',
    });
    
    // Add fallback for Node.js modules that PDF.js might use in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
      util: false,
      buffer: false,
      crypto: false,
    };
    
    return config;
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
