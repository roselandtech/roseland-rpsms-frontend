import type { NextConfig } from "next";

const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://roseland-rpsms-backend.onrender.com";
const backendUrl = rawBackendUrl.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80],
    minimumCacheTTL: 86400,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
      {
        source: '/healthz',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
