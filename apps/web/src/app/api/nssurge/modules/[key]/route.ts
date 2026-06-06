import prisma from '@my-better-t-app/db'
import { authorizeNssurgeDeleteRequest } from '@/lib/nssurge/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY_PATTERN = /^[A-Za-z0-9_-]+$/

function parseKey(raw: string): string | null {
  const key = raw.replace(/\.sgmodule$/, '').trim()
  if (!key || !KEY_PATTERN.test(key)) return null
  return key
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key: raw } = await params
  const key = parseKey(raw)
  if (!key) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const row = await prisma.nssurgeModule.findUnique({ where: { key } })
    if (!row) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(row.value, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[nssurge/modules] GET by key failed', error)
    return new Response('Internal error', { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const access = await authorizeNssurgeDeleteRequest(request)
  if (access instanceof Response) return access

  const { key: raw } = await params
  const key = parseKey(raw)
  if (!key) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await prisma.nssurgeModule.deleteMany({
      where: { key, userId: access.userId },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[nssurge/modules] DELETE failed', error)
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
