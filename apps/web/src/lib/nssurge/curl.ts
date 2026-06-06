import type { NssurgeExchange } from './repository'

const SKIP_HEADER_NAMES = new Set([
  'content-length',
  'connection',
  'accept-encoding',
  'transfer-encoding',
  'host',
  'proxy-connection',
  'keep-alive',
  'upgrade',
])

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function parseRequestHeaders(requestHeadersJson: string | null): Record<string, string> {
  if (!requestHeadersJson) return {}
  try {
    const parsed: unknown = JSON.parse(requestHeadersJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null) continue
      out[key] = typeof value === 'string' ? value : String(value)
    }
    return out
  } catch {
    return {}
  }
}

function shouldSkipHeader(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.startsWith(':')) return true
  return SKIP_HEADER_NAMES.has(lower)
}

function requestBodyForCurl(exchange: NssurgeExchange): string | null {
  if (exchange.requestBodyKind !== 'text') return null
  if (exchange.requestBodyText == null || exchange.requestBodyText === '') return null
  return exchange.requestBodyText
}

export function exchangeToCurl(exchange: NssurgeExchange): string | null {
  if (!exchange.url) return null

  const method = (exchange.method ?? 'GET').toUpperCase()
  const headers = parseRequestHeaders(exchange.requestHeadersJson)
  const body = requestBodyForCurl(exchange)

  const lines: string[] = ['curl']

  if (method !== 'GET') {
    lines.push(`-X ${method}`)
  }

  lines.push(shellSingleQuote(exchange.url))

  const headerEntries = Object.entries(headers).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )

  for (const [name, value] of headerEntries) {
    if (shouldSkipHeader(name)) continue
    lines.push(`-H ${shellSingleQuote(`${name}: ${value}`)}`)
  }

  if (body != null && method !== 'GET' && method !== 'HEAD') {
    lines.push(`--data-raw ${shellSingleQuote(body)}`)
  }

  return lines.join(' \\\n  ')
}
