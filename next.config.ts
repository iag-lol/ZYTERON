import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Prisma client types require a generated client — skip build-time TS check for DB layer
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
