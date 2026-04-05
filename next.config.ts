import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uploaded files are exposed under /uploads/*
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: "/api/files/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
