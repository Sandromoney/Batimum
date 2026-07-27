import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow Cursor port-forward / Cloudflare tunnel origins in dev (avoids hung HMR).
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.cursor.com",
    "*.cursor.sh",
  ],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
