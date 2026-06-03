import z from 'zod'

const REDACTED = '[REDACTED]'

const SENSITIVE_HEADER_NAMES = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
])

const bodyKindSchema = z.enum([
  'none',
  'text',
  'binary_skipped',
  'too_large_skipped',
  'decode_failed_skipped',
])

const bodySchema = z
  .object({
    kind: bodyKindSchema,
    text: z.string().nullable().optional(),
    byteLength: z.number().int().nonnegative().optional(),
    skippedReason: z.string().nullable().optional(),
    base64: z.unknown().optional(),
    sha256: z.unknown().optional(),
  })
  .transform((body) => {
    const { base64: _b, sha256: _s, ...rest } = body
    return {
      kind: rest.kind,
      text: rest.text ?? null,
      byteLength: rest.byteLength ?? 0,
      skippedReason: rest.skippedReason ?? null,
    }
  })

export const nssurgeEventInputSchema = z.object({
  source: z.literal('nssurge'),
  version: z.literal(1),
  eventType: z.enum(['request', 'response']),
  surgeRequestId: z.string().min(1),
  capturedAt: z.number().int().nonnegative(),
  scriptName: z.string().optional().nullable(),
  url: z.string().min(1),
  method: z.string().optional().nullable(),
  host: z.string().optional().nullable(),
  requestHeaders: z.record(z.string(), z.unknown()).optional().nullable(),
  responseStatus: z.number().int().nullable().optional(),
  responseHeaders: z.record(z.string(), z.unknown()).optional().nullable(),
  body: bodySchema.optional().nullable(),
  metadata: z
    .object({
      contentType: z.string().optional().nullable(),
      environment: z.record(z.string(), z.unknown()).optional(),
      network: z.record(z.string(), z.unknown()).optional(),
    })
    .optional()
    .nullable(),
})

export type NssurgeEventInput = z.infer<typeof nssurgeEventInputSchema>

export type NormalizedNssurgeEvent = {
  surgeRequestId: string
  eventType: 'request' | 'response'
  capturedAtMs: bigint
  receivedAtMs: bigint
  scriptName: string | null
  method: string | null
  url: string
  host: string | null
  requestHeadersJson: string | null
  responseStatus: number | null
  responseHeadersJson: string | null
  contentType: string | null
  bodyKind: 'none' | 'text' | 'binary_skipped' | 'too_large_skipped' | 'decode_failed_skipped'
  bodyText: string | null
  bodyByteLength: bigint | null
  bodySkippedReason: string | null
  rawJson: string
}

function headerNameMatches(name: string, sensitive: string): boolean {
  return name.toLowerCase() === sensitive
}

export function redactHeaders(
  headers: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  if (!headers || typeof headers !== 'object') return null

  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    const isSensitive = [...SENSITIVE_HEADER_NAMES].some((name) => headerNameMatches(lower, name))
    if (isSensitive) {
      out[key] = REDACTED
    } else if (value == null) {
      out[key] = ''
    } else if (typeof value === 'string') {
      out[key] = value
    } else {
      out[key] = String(value)
    }
  }
  return out
}

export function redactBodyText(_text: string, _contentType: string | null): string {
  return _text
}

function extractHost(url: string, host: string | null | undefined): string | null {
  if (host) return host
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function extractContentType(
  metadata: NssurgeEventInput['metadata'],
  headers: Record<string, string> | null,
): string | null {
  if (metadata?.contentType) return metadata.contentType
  if (!headers) return null
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-type') return value
  }
  return null
}

export function normalizeNssurgeEvent(input: NssurgeEventInput): NormalizedNssurgeEvent {
  const requestHeaders = redactHeaders(input.requestHeaders ?? undefined)
  const responseHeaders = redactHeaders(input.responseHeaders ?? undefined)

  const body = input.body ?? {
    kind: 'none' as const,
    text: null,
    byteLength: 0,
    skippedReason: null,
  }

  let bodyText: string | null = null
  if (body.kind === 'text' && body.text != null) {
    const contentType = extractContentType(input.metadata, requestHeaders ?? responseHeaders)
    bodyText = redactBodyText(body.text, contentType)
  }

  const host = extractHost(input.url, input.host)
  const contentType = extractContentType(input.metadata, requestHeaders ?? responseHeaders)

  const sanitizedPayload = {
    source: input.source,
    version: input.version,
    eventType: input.eventType,
    surgeRequestId: input.surgeRequestId,
    capturedAt: input.capturedAt,
    scriptName: input.scriptName ?? null,
    url: input.url,
    method: input.method ?? null,
    host,
    requestHeaders: requestHeaders ?? null,
    responseStatus: input.responseStatus ?? null,
    responseHeaders: responseHeaders ?? null,
    body: {
      kind: body.kind,
      text: bodyText,
      byteLength: body.byteLength ?? 0,
      skippedReason: body.skippedReason ?? null,
    },
    metadata: {
      contentType,
      environment: input.metadata?.environment ?? {},
      network: input.metadata?.network ?? {},
    },
  }

  return {
    surgeRequestId: input.surgeRequestId,
    eventType: input.eventType,
    capturedAtMs: BigInt(input.capturedAt),
    receivedAtMs: BigInt(Date.now()),
    scriptName: input.scriptName ?? null,
    method: input.method ?? null,
    url: input.url,
    host,
    requestHeadersJson: requestHeaders ? JSON.stringify(requestHeaders) : null,
    responseStatus: input.responseStatus ?? null,
    responseHeadersJson: responseHeaders ? JSON.stringify(responseHeaders) : null,
    contentType,
    bodyKind: body.kind,
    bodyText,
    bodyByteLength: body.byteLength != null && body.byteLength > 0 ? BigInt(body.byteLength) : null,
    bodySkippedReason: body.skippedReason ?? null,
    rawJson: JSON.stringify(sanitizedPayload),
  }
}
