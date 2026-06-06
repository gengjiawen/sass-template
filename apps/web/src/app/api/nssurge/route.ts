import {
  authorizeNssurgeDeleteRequest,
  authorizeNssurgeReadRequest,
  authorizeNssurgeWriteRequest,
  MAX_NSSURGE_EVENT_BYTES,
} from '@/lib/nssurge/auth'
import {
  clearNssurgeEvents,
  insertNssurgeEvent,
  listNssurgeEvents,
  listNssurgeExchanges,
} from '@/lib/nssurge/repository'
import { normalizeNssurgeEvent, nssurgeEventInputSchema } from '@/lib/nssurge/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

function parseSince(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

function parseStatus(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

export async function POST(request: Request) {
  const access = await authorizeNssurgeWriteRequest(request)
  if (access instanceof Response) return access

  try {
    const rawText = await request.text()
    const byteLength = new TextEncoder().encode(rawText).byteLength

    if (byteLength > MAX_NSSURGE_EVENT_BYTES) {
      return Response.json(
        { error: `Payload exceeds ${MAX_NSSURGE_EVENT_BYTES} bytes` },
        { status: 413 },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = nssurgeEventInputSchema.safeParse(parsed)
    if (!result.success) {
      return Response.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 },
      )
    }

    const normalized = normalizeNssurgeEvent(result.data)
    await insertNssurgeEvent(access.userId, normalized)

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[nssurge] POST failed', error)
    return Response.json({ error: 'Failed to store event' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const access = await authorizeNssurgeReadRequest(request)
  if (access instanceof Response) return access

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') === 'events' ? 'events' : 'exchanges'
  const withBody = searchParams.get('withBody') === 'true'
  const params = {
    limit: parseLimit(searchParams.get('limit')),
    host: searchParams.get('host') ?? undefined,
    status: parseStatus(searchParams.get('status')),
    since: parseSince(searchParams.get('since')),
    q: searchParams.get('q') ?? undefined,
    withBody,
  }

  try {
    if (view === 'events') {
      const eventType = searchParams.get('eventType')
      const data = await listNssurgeEvents({
        ...params,
        userId: access.userId,
        eventType: eventType === 'request' || eventType === 'response' ? eventType : undefined,
      })
      return Response.json({ view, items: data })
    }

    const surgeRequestId = searchParams.get('surgeRequestId') ?? undefined
    const data = await listNssurgeExchanges({ ...params, userId: access.userId, surgeRequestId })
    return Response.json({ view, items: data })
  } catch (error) {
    console.error('[nssurge] GET failed', error)
    return Response.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const access = await authorizeNssurgeDeleteRequest(request)
  if (access instanceof Response) return access

  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'
  const olderThanDaysRaw = searchParams.get('olderThanDays')
  const olderThanDays = olderThanDaysRaw ? Number.parseInt(olderThanDaysRaw, 10) : undefined

  if (!all && (olderThanDays == null || !Number.isFinite(olderThanDays))) {
    return Response.json({ error: 'Provide all=true or olderThanDays=<n>' }, { status: 400 })
  }

  try {
    const deletedCount = await clearNssurgeEvents({ userId: access.userId, all, olderThanDays })
    return Response.json({ ok: true, deletedCount })
  } catch (error) {
    console.error('[nssurge] DELETE failed', error)
    return Response.json({ error: 'Failed to delete events' }, { status: 500 })
  }
}
