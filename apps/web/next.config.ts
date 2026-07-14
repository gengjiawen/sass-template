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
    // TypeScript 7.0 ships only the native `tsc` CLI (no programmatic JS API until
    // TS 7.1). This tells Next.js to invoke the installed `tsc` command directly for
    // its build-time type check instead of the JS API. Requires Next.js >= 16.3.
    useTypeScriptCli: true,
  },
  typedRoutes: true,
  reactCompiler: true,
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
