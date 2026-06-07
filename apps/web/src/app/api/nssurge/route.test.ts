import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, POST } from './route'

const mocks = vi.hoisted(() => ({
  authorizeDelete: vi.fn(),
  authorizeRead: vi.fn(),
  authorizeWrite: vi.fn(),
  clearEvents: vi.fn(),
  insertEvent: vi.fn(),
  listEvents: vi.fn(),
  listExchanges: vi.fn(),
}))

vi.mock('@/lib/nssurge/auth', () => ({
  authorizeNssurgeDeleteRequest: mocks.authorizeDelete,
  authorizeNssurgeReadRequest: mocks.authorizeRead,
  authorizeNssurgeWriteRequest: mocks.authorizeWrite,
  MAX_NSSURGE_EVENT_BYTES: 1024,
}))

vi.mock('@/lib/nssurge/repository', () => ({
  clearNssurgeEvents: mocks.clearEvents,
  insertNssurgeEvent: mocks.insertEvent,
  listNssurgeEvents: mocks.listEvents,
  listNssurgeExchanges: mocks.listExchanges,
}))

const access = { userId: 'user-1', source: 'development' as const }

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    source: 'nssurge',
    version: 1,
    eventType: 'request',
    surgeRequestId: 'req-1',
    capturedAt: 1_700_000_000_000,
    url: 'https://api.example.com/v1/users',
    method: 'POST',
    body: {
      kind: 'text',
      text: 'hello',
      byteLength: 5,
    },
    ...overrides,
  }
}

describe('/api/nssurge route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorizeDelete.mockResolvedValue(access)
    mocks.authorizeRead.mockResolvedValue(access)
    mocks.authorizeWrite.mockResolvedValue(access)
    mocks.clearEvents.mockResolvedValue(0)
    mocks.insertEvent.mockResolvedValue({})
    mocks.listEvents.mockResolvedValue([])
    mocks.listExchanges.mockResolvedValue([])
  })

  it('stores a valid collector event', async () => {
    const response = await POST(
      new Request('http://test.local/api/nssurge', {
        method: 'POST',
        body: JSON.stringify(makePayload()),
      }),
    )

    expect(response.status).toBe(204)
    expect(mocks.insertEvent).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        surgeRequestId: 'req-1',
        eventType: 'request',
        method: 'POST',
        host: 'api.example.com',
        bodyText: 'hello',
      }),
    )
  })

  it('rejects oversized payloads before JSON parsing', async () => {
    const response = await POST(
      new Request('http://test.local/api/nssurge', {
        method: 'POST',
        body: 'x'.repeat(1025),
      }),
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'Payload exceeds 1024 bytes' })
    expect(mocks.insertEvent).not.toHaveBeenCalled()
  })

  it('returns validation errors for invalid collector payloads', async () => {
    const response = await POST(
      new Request('http://test.local/api/nssurge', {
        method: 'POST',
        body: JSON.stringify(makePayload({ surgeRequestId: '' })),
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Validation failed' })
    expect(mocks.insertEvent).not.toHaveBeenCalled()
  })

  it('lists raw events with parsed query params', async () => {
    mocks.listEvents.mockResolvedValue([{ id: 'event-1' }])

    const response = await GET(
      new Request(
        'http://test.local/api/nssurge?view=events&eventType=response&limit=20&host=api.example.com&status=201&since=170&q=/users&withBody=true',
      ),
    )

    expect(mocks.listEvents).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 20,
      host: 'api.example.com',
      status: 201,
      since: 170,
      q: '/users',
      withBody: true,
      eventType: 'response',
    })
    expect(await response.json()).toEqual({ view: 'events', items: [{ id: 'event-1' }] })
  })

  it('lists exchanges by default and supports detail lookup', async () => {
    mocks.listExchanges.mockResolvedValue([{ surgeRequestId: 'req-1' }])

    const response = await GET(
      new Request(
        'http://test.local/api/nssurge?surgeRequestId=req-1&limit=not-a-number&withBody=true',
      ),
    )

    expect(mocks.listExchanges).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: undefined,
      host: undefined,
      status: undefined,
      since: undefined,
      q: undefined,
      withBody: true,
      surgeRequestId: 'req-1',
    })
    expect(await response.json()).toEqual({
      view: 'exchanges',
      items: [{ surgeRequestId: 'req-1' }],
    })
  })

  it('requires an explicit delete scope', async () => {
    const response = await DELETE(
      new Request('http://test.local/api/nssurge', { method: 'DELETE' }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Provide all=true or olderThanDays=<n>' })
    expect(mocks.clearEvents).not.toHaveBeenCalled()
  })

  it('clears scoped events', async () => {
    mocks.clearEvents.mockResolvedValue(3)

    const response = await DELETE(
      new Request('http://test.local/api/nssurge?olderThanDays=7', { method: 'DELETE' }),
    )

    expect(mocks.clearEvents).toHaveBeenCalledWith({
      userId: 'user-1',
      all: false,
      olderThanDays: 7,
    })
    expect(await response.json()).toEqual({ ok: true, deletedCount: 3 })
  })
})
