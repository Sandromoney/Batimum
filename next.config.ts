import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow Cursor port-forward / Cloudflare tunnel / local IP origins in dev
  // (without this, /_next CSS/JS are blocked → unstyled landing / raw header list).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
    "*.cursor.com",
    "*.cursor.sh",
  ],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
