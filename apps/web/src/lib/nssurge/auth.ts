import { auth, generateUserApiToken } from '@my-better-t-app/auth'
import prisma from '@my-better-t-app/db'

export const MAX_NSSURGE_EVENT_BYTES = 4_194_304

const DEV_NSSURGE_USER_ID = 'nssurge-dev-user'
const DEV_NSSURGE_API_TOKEN = 'nss_dev_local'
const DEV_NSSURGE_EMAIL = 'nssurge-dev@example.local'

export type NssurgeAccess = {
  userId: string
  source: 'api-token' | 'session' | 'development'
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, ...parts] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer') return null

  const token = parts.join(' ').trim()
  return token.length > 0 ? token : null
}

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function ensureUserApiToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiToken: true },
  })

  if (!user) {
    throw new Error(`User ${userId} not found`)
  }

  if (user.apiToken) return user.apiToken

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { apiToken: generateUserApiToken() },
    select: { apiToken: true },
  })

  return updated.apiToken
}

export async function ensureDevelopmentNssurgeUser(): Promise<NssurgeAccess> {
  await prisma.user.upsert({
    where: { id: DEV_NSSURGE_USER_ID },
    update: {
      apiToken: DEV_NSSURGE_API_TOKEN,
    },
    create: {
      id: DEV_NSSURGE_USER_ID,
      name: 'NSSurge Dev',
      email: DEV_NSSURGE_EMAIL,
      emailVerified: true,
      apiToken: DEV_NSSURGE_API_TOKEN,
    },
    select: { id: true },
  })

  return { userId: DEV_NSSURGE_USER_ID, source: 'development' }
}

async function accessFromSession(request: Request): Promise<NssurgeAccess | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) return null

  await ensureUserApiToken(session.user.id)
  return { userId: session.user.id, source: 'session' }
}

async function accessFromApiToken(token: string | null): Promise<NssurgeAccess | null> {
  if (!token) return null

  const user = await prisma.user.findUnique({
    where: { apiToken: token },
    select: { id: true },
  })

  return user ? { userId: user.id, source: 'api-token' } : null
}

async function developmentAccess() {
  if (isProduction()) return null
  return ensureDevelopmentNssurgeUser()
}

export async function authorizeNssurgeReadRequest(
  request: Request,
): Promise<NssurgeAccess | Response> {
  const sessionAccess = await accessFromSession(request)
  if (sessionAccess) return sessionAccess

  const bearer = getBearerToken(request)
  if (bearer) {
    const tokenAccess = await accessFromApiToken(bearer)
    return tokenAccess ?? unauthorized()
  }

  const devAccess = await developmentAccess()
  if (devAccess) return devAccess

  return unauthorized()
}

export async function authorizeNssurgeWriteRequest(
  request: Request,
): Promise<NssurgeAccess | Response> {
  const bearer = getBearerToken(request)

  if (bearer) {
    const tokenAccess = await accessFromApiToken(bearer)
    return tokenAccess ?? unauthorized()
  }

  const devAccess = await developmentAccess()
  if (devAccess) return devAccess

  return unauthorized()
}

export async function authorizeNssurgeDeleteRequest(
  request: Request,
): Promise<NssurgeAccess | Response> {
  return authorizeNssurgeReadRequest(request)
}
