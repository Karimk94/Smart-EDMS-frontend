/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Reduces deployment artifact size for production
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Tree-shake heavy libraries — only bundle the exports actually used
    optimizePackageImports: ['react-select', 'react-datepicker', 'xlsx', 'jszip', 'docx-preview', 'exifreader'],
  },
};

export default nextConfig;
