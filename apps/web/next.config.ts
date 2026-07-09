import '@my-better-t-app/env/web'
import { createMDX } from 'fumadocs-mdx/next'
import type { NextConfig } from 'next'

const withMDX = createMDX()

const nextConfig: NextConfig = {
  allowedDevOrigins: ['eu.gengjiawen.com'],
  experimental: {
    proxyTimeout: 5 * 60 * 1000,
    proxyClientMaxBodySize: '256mb',
    turbopackFileSystemCacheForBuild: true,
  },
  typedRoutes: true,
  reactCompiler: true,
  // TypeScript 7.0 ships only the native `tsc` CLI; the programmatic JS API that
  // Next.js uses for its build-time type check does not land until TS 7.1. Disable
  // Next's type check and rely on the native `tsc` compiler for type safety instead.
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ]
  },
}

export default withMDX(nextConfig)
