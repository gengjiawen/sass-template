import { describe, expect, it } from 'vitest'
import { exchangeToCurl } from './curl'
import type { NssurgeExchange } from './repository'

function makeExchange(overrides: Partial<NssurgeExchange> = {}): NssurgeExchange {
  return {
    surgeRequestId: 'req-1',
    requestCapturedAtMs: 1,
    responseCapturedAtMs: null,
    method: 'GET',
    url: 'https://api.example.com',
    host: 'api.example.com',
    responseStatus: null,
    requestContentType: null,
    responseContentType: null,
    requestHeadersJson: null,
    responseHeadersJson: null,
    requestBodyKind: 'none',
    responseBodyKind: null,
    requestBodyByteLength: null,
    responseBodyByteLength: null,
    requestBodySkippedReason: null,
    responseBodySkippedReason: null,
    ...overrides,
  }
}

describe('exchangeToCurl', () => {
  it('builds a reproducible curl command and shell-quotes values', () => {
    const curl = exchangeToCurl(
      makeExchange({
        method: 'post',
        url: "https://api.example.com/search?q=one'two",
        requestHeadersJson: JSON.stringify({
          'content-length': '999',
          Host: 'api.example.com',
          Accept: 'application/json',
          'X-Custom': "O'Reilly",
        }),
        requestBodyKind: 'text',
        requestBodyText: '{"name":"O\'Reilly"}',
      }),
    )

    expect(curl).toBe(
      [
        'curl',
        '-X POST',
        "'https://api.example.com/search?q=one'\\''two'",
        "-H 'Accept: application/json'",
        "-H 'X-Custom: O'\\''Reilly'",
        "--data-raw '{\"name\":\"O'\\''Reilly\"}'",
      ].join(' \\\n  '),
    )
  })

  it('omits invalid headers and request bodies for GET requests', () => {
    const curl = exchangeToCurl(
      makeExchange({
        requestHeadersJson: '{not-json',
        requestBodyKind: 'text',
        requestBodyText: 'ignored',
      }),
    )

    expect(curl).toBe("curl \\\n  'https://api.example.com'")
  })

  it('returns null when the exchange has no URL', () => {
    expect(exchangeToCurl(makeExchange({ url: '' }))).toBeNull()
  })
})
