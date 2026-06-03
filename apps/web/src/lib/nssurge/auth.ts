const NSSURGE_TOKEN_ENV = 'NSSURGE_COLLECTOR_TOKEN'

export function getCollectorToken(): string | undefined {
  const token = process.env[NSSURGE_TOKEN_ENV]
  return token && token.length > 0 ? token : undefined
}

export function getMaxEventBytes(): number {
  const raw = process.env.NSSURGE_MAX_EVENT_BYTES
  const parsed = raw ? Number.parseInt(raw, 10) : 4_194_304
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4_194_304
}

export function authorizeCollectorRequest(
  request: Request,
  options: { required: boolean },
): Response | null {
  const expected = getCollectorToken()
  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null

  if (!expected) {
    if (options.required) {
      return Response.json({ error: 'Collector token not configured' }, { status: 503 })
    }
    if (process.env.NODE_ENV === 'production') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.warn(
      '[nssurge] NSSURGE_COLLECTOR_TOKEN is not set; allowing unauthenticated access in development',
    )
    return null
  }

  if (bearer !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
