import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
