import type { NextConfig } from "next";

const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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
        source: '/healthz',
        destination: `${backendUrl}/healthz`,
      },
    ];
  },
};

export default nextConfig;
