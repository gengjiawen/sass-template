import { randomBytes } from 'node:crypto'
import prisma from '@my-better-t-app/db'
import { authorizeNssurgeReadRequest, authorizeNssurgeUserRequest } from '@/lib/nssurge/auth'

export const runtime = 'nodejs'

const KEY_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_KEY_LENGTH = 128
const MAX_MODULE_BYTES = 1_048_576

function newKey() {
  return randomBytes(16).toString('base64url')
}

function parseKey(value: string): string | Response {
  const key = value.trim().replace(/\.sgmodule$/, '')
  if (!key) {
    return Response.json({ error: 'key is required' }, { status: 400 })
  }
  if (key.length > MAX_KEY_LENGTH) {
    return Response.json({ error: `key too long (max ${MAX_KEY_LENGTH})` }, { status: 400 })
  }
  if (!KEY_PATTERN.test(key)) {
    return Response.json(
      { error: 'key may only contain letters, numbers, _ and -' },
      { status: 400 },
    )
  }
  return key
}

export async function POST(request: Request) {
  const access = await authorizeNssurgeUserRequest(request)
  if (access instanceof Response) return access

  try {
    let body: { key?: string; value?: string }
    try {
      body = (await request.json()) as { key?: string; value?: string }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!body.value || typeof body.value !== 'string') {
      return Response.json({ error: 'value is required' }, { status: 400 })
    }

    const byteLength = new TextEncoder().encode(body.value).byteLength
    if (byteLength > MAX_MODULE_BYTES) {
      return Response.json({ error: `value exceeds ${MAX_MODULE_BYTES} bytes` }, { status: 413 })
    }

    const key = body.key ? parseKey(body.key) : newKey()
    if (key instanceof Response) return key

    const existing = await prisma.nssurgeModule.findUnique({
      where: { key },
      select: { userId: true },
    })

    if (existing && existing.userId !== access.userId) {
      return Response.json({ error: 'key already exists' }, { status: 409 })
    }

    if (existing) {
      await prisma.nssurgeModule.update({
        where: { key },
        data: { value: body.value },
      })
    } else {
      await prisma.nssurgeModule.create({
        data: { key, value: body.value, userId: access.userId },
      })
    }

    const url = `/api/nssurge/modules/${key}.sgmodule`

    return Response.json({ key, url })
  } catch (error) {
    console.error('[nssurge/modules] POST failed', error)
    return Response.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const access = await authorizeNssurgeReadRequest(request)
  if (access instanceof Response) return access

  try {
    const rows = await prisma.nssurgeModule.findMany({
      where: { userId: access.userId },
      select: { key: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    return Response.json({
      items: rows.map((r) => ({
        key: r.key,
        url: `/api/nssurge/modules/${r.key}.sgmodule`,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[nssurge/modules] GET failed', error)
    return Response.json({ error: 'Failed to list' }, { status: 500 })
  }
}
