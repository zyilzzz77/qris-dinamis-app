import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local uploads are served from /public/uploads/ — no remote patterns needed
  images: {
    // Allow serving from local /uploads/ path
    remotePatterns: [],
  },
};

export default nextConfig;
