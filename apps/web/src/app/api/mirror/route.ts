/**
 * GitHub release mirror API.
 *
 * Resolves a GitHub releases asset (or any compatible `owner/repo/releases/download/...`
 * mirror path) to a locally cached file and serves it via an internal download URL. The
 * upstream source is GitHub by default, but the same flow can serve other mirrors that
 * expose the same path layout.
 *
 * - GET /api/mirror?url=... — cache if needed, then download the file
 * - GET /api/mirror?url=... + Accept: application/json — return `{ url }` with path-style mirror URL
 * - GET /api/mirror/{path} — cache if needed, then download the file
 *
 * Example download URL:
 *   http://localhost:3000/api/mirror/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip
 *
 * Cache directory: `GITHUB_MIRROR_DOWNLOAD_DIR` (defaults to `os.tmpdir()`).
 * Cache status header: `X-GitHub-Mirror-Cache: hit | miss`.
 */
import {
  EXAMPLE_MIRROR_URL,
  buildDownloadUrl,
  ensureCached,
  parseMirrorPath,
  streamCachedFile,
} from './shared'

export const runtime = 'nodejs'

function wantsJsonResponse(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/json') ?? false
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('url')

  if (!target) {
    return Response.json(
      {
        error: 'Missing required query parameter: url',
        example: `/api/mirror?url=${EXAMPLE_MIRROR_URL}`,
      },
      { status: 400 },
    )
  }

  const mirrorPath = parseMirrorPath(target)
  if (!mirrorPath) {
    return Response.json(
      {
        error: 'Invalid url',
        hint: `Expected a github.com releases download URL, e.g. ${EXAMPLE_MIRROR_URL}`,
      },
      { status: 400 },
    )
  }

  const result = await ensureCached(mirrorPath)
  if (result instanceof Response) return result

  const cacheHeader = { 'X-GitHub-Mirror-Cache': result.cached ? 'hit' : 'miss' }

  if (wantsJsonResponse(request)) {
    return Response.json({ url: buildDownloadUrl(request, mirrorPath) }, { headers: cacheHeader })
  }

  return streamCachedFile(result.localPath, mirrorPath, cacheHeader)
}
