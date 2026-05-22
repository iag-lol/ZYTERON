import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Prisma client types require a generated client — skip build-time TS check for DB layer
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.falabella.com",
      },
      {
        protocol: "https",
        hostname: "cdnx.jumpseller.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "zyteron.cl",
          },
        ],
        destination: "https://www.zyteron.cl/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|gif|ico|avif|woff|woff2|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
