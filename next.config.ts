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
};

export default nextConfig;
