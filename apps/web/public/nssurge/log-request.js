/**
 * Surge http-request script — POST captured request to NSSurge collector.
 * Arguments: endpoint=<url>&token=<token>
 */

function parseArguments(argument) {
  const params = {}
  if (!argument) return params
  for (const part of String(argument).split('&')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx)
    const value = part.slice(idx + 1)
    try {
      params[key] = decodeURIComponent(value)
    } catch {
      params[key] = value
    }
  }
  return params
}

function utf8ByteLength(str) {
  if (!str) return 0
  let bytes = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

function approximateUtf8Bytes(str) {
  return utf8ByteLength(str)
}

function getContentType(headers) {
  if (!headers) return ''
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-type') {
      return String(headers[key] || '')
    }
  }
  return ''
}

function isBinaryContentType(contentType) {
  const ct = (contentType || '').toLowerCase()
  if (!ct) return false
  if (ct.startsWith('image/')) return true
  if (ct.startsWith('video/')) return true
  if (ct.startsWith('audio/')) return true
  if (ct.startsWith('font/')) return true
  if (ct === 'application/octet-stream') return true
  if (ct === 'application/pdf') return true
  if (ct === 'application/zip') return true
  return false
}

function isTextContentType(contentType) {
  const ct = (contentType || '').toLowerCase()
  if (!ct) return false
  if (ct.startsWith('text/')) return true
  if (ct === 'application/json') return true
  if (ct === 'application/xml') return true
  if (ct === 'application/x-www-form-urlencoded') return true
  if (ct === 'application/graphql') return true
  if (ct === 'application/javascript') return true
  if (ct.endsWith('+json')) return true
  if (ct.endsWith('+xml')) return true
  return false
}

function normalizeBody(body, headers) {
  const contentType = getContentType(headers)

  if (body == null) {
    return { kind: 'none', text: null, byteLength: 0, skippedReason: null }
  }

  if (typeof body === 'string') {
    if (isBinaryContentType(contentType)) {
      return {
        kind: 'binary_skipped',
        text: null,
        byteLength: approximateUtf8Bytes(body),
        skippedReason: 'binary content-type',
      }
    }
    return {
      kind: 'text',
      text: body,
      byteLength: utf8ByteLength(body),
      skippedReason: null,
    }
  }

  if (typeof body === 'object' && body.byteLength != null) {
    const len = body.byteLength
    if (isTextContentType(contentType)) {
      try {
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(body)
        return {
          kind: 'text',
          text: decoded,
          byteLength: len,
          skippedReason: null,
        }
      } catch {
        return {
          kind: 'decode_failed_skipped',
          text: null,
          byteLength: len,
          skippedReason: 'Uint8Array decode failed',
        }
      }
    }
    return {
      kind: 'binary_skipped',
      text: null,
      byteLength: len,
      skippedReason: 'Uint8Array binary body',
    }
  }

  return { kind: 'none', text: null, byteLength: 0, skippedReason: null }
}

function extractHost(url) {
  try {
    const m = String(url).match(/^https?:\/\/([^/?#]+)/i)
    return m ? m[1] : null
  } catch {
    return null
  }
}

function shouldSkip(url) {
  return String(url).includes('/api/nssurge')
}

const args = parseArguments($argument)
const endpoint = args.endpoint || 'http://127.0.0.1:3000/api/nssurge'
const token = args.token || ''

const url = $request.url
if (shouldSkip(url)) {
  $done({})
} else {
  const headers = $request.headers || {}
  const body = normalizeBody($request.body, headers)
  const payload = {
    source: 'nssurge',
    version: 1,
    eventType: 'request',
    surgeRequestId: String($request.id),
    capturedAt: Date.now(),
    scriptName: $script.name,
    url,
    method: $request.method,
    host: extractHost(url),
    requestHeaders: headers,
    responseStatus: null,
    responseHeaders: null,
    body,
    metadata: {
      contentType: getContentType(headers),
      environment: $environment || {},
      network: $network || {},
    },
  }

  const postHeaders = { 'Content-Type': 'application/json' }
  if (token) postHeaders.Authorization = 'Bearer ' + token

  $httpClient.post({
    url: endpoint,
    headers: postHeaders,
    body: JSON.stringify(payload),
    timeout: 1,
  })

  $done({})
}
