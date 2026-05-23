import { ensureCached, streamCachedFile } from '../shared'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params
  const mirrorPath = segments.join('/')

  const result = await ensureCached(mirrorPath)
  if (result instanceof Response) return result

  return streamCachedFile(result.localPath, mirrorPath, {
    'X-GitHub-Mirror-Cache': result.cached ? 'hit' : 'miss',
  })
}
