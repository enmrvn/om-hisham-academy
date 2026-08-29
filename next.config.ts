import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-lib"],
  experimental: {
    serverActions: {
      // ملفات PDF التي ترفعها المدربة قد تصل إلى عشرات الميجابايت.
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
