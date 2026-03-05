import "@my-better-t-app/env/web";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  experimental: {
    proxyTimeout: 5 * 60 * 1000,
    proxyClientMaxBodySize: '256mb',
    turbopackFileSystemCacheForBuild: true,
  },
  typedRoutes: true,
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

export default withMDX(nextConfig);
