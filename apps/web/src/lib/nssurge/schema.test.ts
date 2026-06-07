import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeNssurgeEvent, nssurgeEventInputSchema } from './schema'

describe('nssurgeEventInputSchema', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes headers, body metadata, host, and content type', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const parsed = nssurgeEventInputSchema.parse({
      source: 'nssurge',
      version: 1,
      eventType: 'request',
      surgeRequestId: 'req-1',
      capturedAt: 1_700_000_000_123,
      scriptName: 'log-request',
      url: 'https://api.example.com/v1/users',
      method: 'post',
      requestHeaders: {
        'content-type': 'application/json',
        'x-count': 42,
        'x-empty': null,
      },
      body: {
        kind: 'text',
        text: '{"ok":true}',
        byteLength: 11,
        base64: 'ignored',
        sha256: 'ignored',
      },
    })

    expect(parsed.body).toEqual({
      kind: 'text',
      text: '{"ok":true}',
      byteLength: 11,
      skippedReason: null,
    })

    const normalized = normalizeNssurgeEvent(parsed)

    expect(normalized).toMatchObject({
      surgeRequestId: 'req-1',
      eventType: 'request',
      capturedAtMs: 1_700_000_000_123n,
      receivedAtMs: 1_700_000_000_000n,
      method: 'post',
      url: 'https://api.example.com/v1/users',
      host: 'api.example.com',
      contentType: 'application/json',
      bodyKind: 'text',
      bodyText: '{"ok":true}',
      bodyByteLength: 11n,
    })
    expect(JSON.parse(normalized.requestHeadersJson ?? '')).toEqual({
      'content-type': 'application/json',
      'x-count': '42',
      'x-empty': '',
    })
    expect(JSON.parse(normalized.rawJson)).toMatchObject({
      body: {
        kind: 'text',
        text: '{"ok":true}',
        byteLength: 11,
        skippedReason: null,
      },
      metadata: {
        contentType: 'application/json',
      },
    })
  })

  it('uses explicit metadata content type before response headers', () => {
    const parsed = nssurgeEventInputSchema.parse({
      source: 'nssurge',
      version: 1,
      eventType: 'response',
      surgeRequestId: 'req-2',
      capturedAt: 1,
      url: 'not-a-url',
      responseStatus: 204,
      responseHeaders: {
        'content-type': 'text/plain',
      },
      body: {
        kind: 'binary_skipped',
        byteLength: 128,
        skippedReason: 'binary',
      },
      metadata: {
        contentType: 'application/octet-stream',
      },
    })

    const normalized = normalizeNssurgeEvent(parsed)

    expect(normalized).toMatchObject({
      host: null,
      responseStatus: 204,
      contentType: 'application/octet-stream',
      bodyKind: 'binary_skipped',
      bodyText: null,
      bodyByteLength: 128n,
      bodySkippedReason: 'binary',
    })
  })

  it('rejects malformed collector payloads', () => {
    const result = nssurgeEventInputSchema.safeParse({
      source: 'nssurge',
      version: 2,
      eventType: 'request',
      surgeRequestId: '',
      capturedAt: -1,
      url: '',
    })

    expect(result.success).toBe(false)
  })
})
