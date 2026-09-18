import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "openai", "@prisma/client", "@prisma/adapter-pg"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
