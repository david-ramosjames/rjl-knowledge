import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "openai", "@prisma/client", "@prisma/adapter-pg", "unpdf", "mammoth"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
