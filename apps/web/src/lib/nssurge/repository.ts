import prisma from '@my-better-t-app/db'
import type { NormalizedNssurgeEvent } from './schema'

type NssurgeBodyKind =
  | 'none'
  | 'text'
  | 'binary_skipped'
  | 'too_large_skipped'
  | 'decode_failed_skipped'

type NssurgeEventType = 'request' | 'response'

type NssurgeHttpEvent = Awaited<ReturnType<typeof prisma.nssurgeHttpEvent.findMany>>[number]

export type ListEventsParams = {
  limit?: number
  host?: string
  eventType?: 'request' | 'response'
  status?: number
  since?: number
  q?: string
  withBody?: boolean
}

export type ListExchangesParams = {
  limit?: number
  host?: string
  status?: number
  since?: number
  q?: string
  surgeRequestId?: string
  withBody?: boolean
}

export type NssurgeExchange = {
  surgeRequestId: string
  requestCapturedAtMs: number | null
  responseCapturedAtMs: number | null
  method: string | null
  url: string
  host: string | null
  responseStatus: number | null
  requestContentType: string | null
  responseContentType: string | null
  requestHeadersJson: string | null
  responseHeadersJson: string | null
  requestBodyKind: NssurgeBodyKind | null
  responseBodyKind: NssurgeBodyKind | null
  requestBodyByteLength: number | null
  responseBodyByteLength: number | null
  requestBodySkippedReason: string | null
  responseBodySkippedReason: string | null
  requestBodyText?: string | null
  responseBodyText?: string | null
}

function clampLimit(limit: number | undefined): number {
  const n = limit ?? 100
  return Math.min(Math.max(1, n), 1000)
}

function buildEventWhere(params: {
  host?: string
  eventType?: NssurgeEventType
  status?: number
  since?: number
  q?: string
}): Record<string, unknown> {
  const and: Record<string, unknown>[] = []

  if (params.since != null) {
    and.push({ capturedAtMs: { gte: BigInt(params.since) } })
  }

  if (params.q) {
    and.push({ url: { contains: params.q } })
  }

  if (params.host) {
    and.push({
      OR: [{ host: params.host }, { url: { contains: params.host } }],
    })
  }

  if (params.eventType) {
    and.push({ eventType: params.eventType })
  }

  if (params.status != null && params.eventType === 'response') {
    and.push({ responseStatus: params.status })
  } else if (params.status != null && !params.eventType) {
    and.push({ eventType: 'response', responseStatus: params.status })
  }

  if (and.length === 0) return {}
  if (and.length === 1) return and[0]!
  return { AND: and }
}

function eventToJson(event: NssurgeHttpEvent, withBody: boolean) {
  const base = {
    id: event.id,
    surgeRequestId: event.surgeRequestId,
    eventType: event.eventType,
    capturedAtMs: Number(event.capturedAtMs),
    receivedAtMs: Number(event.receivedAtMs),
    scriptName: event.scriptName,
    method: event.method,
    url: event.url,
    host: event.host,
    requestHeadersJson: event.requestHeadersJson,
    responseStatus: event.responseStatus,
    responseHeadersJson: event.responseHeadersJson,
    contentType: event.contentType,
    bodyKind: event.bodyKind,
    bodyByteLength: event.bodyByteLength != null ? Number(event.bodyByteLength) : null,
    bodySkippedReason: event.bodySkippedReason,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }

  if (!withBody) return base
  return { ...base, bodyText: event.bodyText }
}

function eventToExchangePart(event: NssurgeHttpEvent, withBody: boolean): Partial<NssurgeExchange> {
  if (event.eventType === 'request') {
    return {
      requestCapturedAtMs: Number(event.capturedAtMs),
      method: event.method,
      url: event.url,
      host: event.host,
      requestContentType: event.contentType,
      requestHeadersJson: event.requestHeadersJson,
      requestBodyKind: event.bodyKind,
      requestBodyByteLength: event.bodyByteLength != null ? Number(event.bodyByteLength) : null,
      requestBodySkippedReason: event.bodySkippedReason,
      ...(withBody ? { requestBodyText: event.bodyText } : {}),
    }
  }

  return {
    responseCapturedAtMs: Number(event.capturedAtMs),
    responseStatus: event.responseStatus,
    responseContentType: event.contentType,
    responseHeadersJson: event.responseHeadersJson,
    responseBodyKind: event.bodyKind,
    responseBodyByteLength: event.bodyByteLength != null ? Number(event.bodyByteLength) : null,
    responseBodySkippedReason: event.bodySkippedReason,
    ...(withBody ? { responseBodyText: event.bodyText } : {}),
  }
}

export async function insertNssurgeEvent(event: NormalizedNssurgeEvent) {
  return prisma.nssurgeHttpEvent.upsert({
    where: {
      surgeRequestId_eventType: {
        surgeRequestId: event.surgeRequestId,
        eventType: event.eventType,
      },
    },
    create: {
      surgeRequestId: event.surgeRequestId,
      eventType: event.eventType,
      capturedAtMs: event.capturedAtMs,
      receivedAtMs: event.receivedAtMs,
      scriptName: event.scriptName,
      method: event.method,
      url: event.url,
      host: event.host,
      requestHeadersJson: event.requestHeadersJson,
      responseStatus: event.responseStatus,
      responseHeadersJson: event.responseHeadersJson,
      contentType: event.contentType,
      bodyKind: event.bodyKind,
      bodyText: event.bodyText,
      bodyByteLength: event.bodyByteLength,
      bodySkippedReason: event.bodySkippedReason,
      rawJson: event.rawJson,
    },
    update: {
      capturedAtMs: event.capturedAtMs,
      receivedAtMs: event.receivedAtMs,
      scriptName: event.scriptName,
      method: event.method,
      url: event.url,
      host: event.host,
      requestHeadersJson: event.requestHeadersJson,
      responseStatus: event.responseStatus,
      responseHeadersJson: event.responseHeadersJson,
      contentType: event.contentType,
      bodyKind: event.bodyKind,
      bodyText: event.bodyText,
      bodyByteLength: event.bodyByteLength,
      bodySkippedReason: event.bodySkippedReason,
      rawJson: event.rawJson,
    },
  })
}

export async function listNssurgeEvents(params: ListEventsParams) {
  const limit = clampLimit(params.limit)
  const where = buildEventWhere({
    host: params.host,
    eventType: params.eventType,
    status: params.status,
    since: params.since,
    q: params.q,
  })

  const events = await prisma.nssurgeHttpEvent.findMany({
    where,
    orderBy: { capturedAtMs: 'desc' },
    take: limit,
  })

  return events.map((e) => eventToJson(e, params.withBody ?? false))
}

export async function listNssurgeExchanges(
  params: ListExchangesParams,
): Promise<NssurgeExchange[]> {
  if (params.surgeRequestId) {
    const events = await prisma.nssurgeHttpEvent.findMany({
      where: { surgeRequestId: params.surgeRequestId },
    })
    if (events.length === 0) return []
    const req = events.find((e) => e.eventType === 'request')
    const res = events.find((e) => e.eventType === 'response')
    const withBody = params.withBody ?? false
    return [
      {
        surgeRequestId: params.surgeRequestId,
        requestCapturedAtMs: req ? Number(req.capturedAtMs) : null,
        responseCapturedAtMs: res ? Number(res.capturedAtMs) : null,
        method: req?.method ?? res?.method ?? null,
        url: req?.url ?? res?.url ?? '',
        host: req?.host ?? res?.host ?? null,
        responseStatus: res?.responseStatus ?? null,
        requestContentType: req?.contentType ?? null,
        responseContentType: res?.contentType ?? null,
        requestHeadersJson: req?.requestHeadersJson ?? null,
        responseHeadersJson: res?.responseHeadersJson ?? null,
        requestBodyKind: req?.bodyKind ?? null,
        responseBodyKind: res?.bodyKind ?? null,
        requestBodyByteLength: req?.bodyByteLength != null ? Number(req.bodyByteLength) : null,
        responseBodyByteLength: res?.bodyByteLength != null ? Number(res.bodyByteLength) : null,
        requestBodySkippedReason: req?.bodySkippedReason ?? null,
        responseBodySkippedReason: res?.bodySkippedReason ?? null,
        ...(req ? eventToExchangePart(req, withBody) : {}),
        ...(res ? eventToExchangePart(res, withBody) : {}),
      },
    ]
  }

  const limit = clampLimit(params.limit)
  const fetchLimit = Math.min(limit * 4, 4000)

  const baseWhere = buildEventWhere({
    host: params.host,
    since: params.since,
    q: params.q,
  })

  let events = await prisma.nssurgeHttpEvent.findMany({
    where: baseWhere,
    orderBy: { capturedAtMs: 'desc' },
    take: fetchLimit,
  })

  if (params.status != null) {
    const responseIds = new Set(
      events
        .filter((e) => e.eventType === 'response' && e.responseStatus === params.status)
        .map((e) => e.surgeRequestId),
    )
    events = events.filter((e) => responseIds.has(e.surgeRequestId))
  }

  const byId = new Map<string, { request?: NssurgeHttpEvent; response?: NssurgeHttpEvent }>()

  for (const event of events) {
    const entry = byId.get(event.surgeRequestId) ?? {}
    if (event.eventType === 'request') entry.request = event
    else entry.response = event
    byId.set(event.surgeRequestId, entry)
  }

  const exchangesWithSort: Array<{ sortMs: number; exchange: NssurgeExchange }> = []

  for (const [surgeRequestId, pair] of byId) {
    const req = pair.request
    const res = pair.response
    const sortMs =
      res != null ? Number(res.capturedAtMs) : req != null ? Number(req.capturedAtMs) : 0

    const exchange: NssurgeExchange = {
      surgeRequestId,
      requestCapturedAtMs: req ? Number(req.capturedAtMs) : null,
      responseCapturedAtMs: res ? Number(res.capturedAtMs) : null,
      method: req?.method ?? res?.method ?? null,
      url: req?.url ?? res?.url ?? '',
      host: req?.host ?? res?.host ?? null,
      responseStatus: res?.responseStatus ?? null,
      requestContentType: req?.contentType ?? null,
      responseContentType: res?.contentType ?? null,
      requestHeadersJson: req?.requestHeadersJson ?? null,
      responseHeadersJson: res?.responseHeadersJson ?? null,
      requestBodyKind: req?.bodyKind ?? null,
      responseBodyKind: res?.bodyKind ?? null,
      requestBodyByteLength: req?.bodyByteLength != null ? Number(req.bodyByteLength) : null,
      responseBodyByteLength: res?.bodyByteLength != null ? Number(res.bodyByteLength) : null,
      requestBodySkippedReason: req?.bodySkippedReason ?? null,
      responseBodySkippedReason: res?.bodySkippedReason ?? null,
      ...(req ? eventToExchangePart(req, params.withBody ?? false) : {}),
      ...(res ? eventToExchangePart(res, params.withBody ?? false) : {}),
    }

    exchangesWithSort.push({ sortMs, exchange })
  }

  exchangesWithSort.sort((a, b) => b.sortMs - a.sortMs)

  return exchangesWithSort.slice(0, limit).map((item) => item.exchange)
}

export async function clearNssurgeEvents(params: { all?: boolean; olderThanDays?: number }) {
  if (params.all) {
    const result = await prisma.nssurgeHttpEvent.deleteMany({})
    return result.count
  }

  if (params.olderThanDays != null && params.olderThanDays > 0) {
    const cutoff = BigInt(Date.now() - params.olderThanDays * 24 * 60 * 60 * 1000)
    const result = await prisma.nssurgeHttpEvent.deleteMany({
      where: { capturedAtMs: { lt: cutoff } },
    })
    return result.count
  }

  return 0
}
