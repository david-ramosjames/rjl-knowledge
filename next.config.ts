import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "openai",
    "@prisma/client",
    "@prisma/adapter-pg",
    "unpdf",
    "mammoth",
    "@napi-rs/canvas",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "50mb",
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
