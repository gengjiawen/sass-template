import { createHash } from 'node:crypto'
import prisma from '@my-better-t-app/db'
import { env } from '@my-better-t-app/env/server'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { generateUserApiToken } from './token'

const ADMIN_ROLE = 'admin'
const CREDENTIAL_PROVIDER_ID = 'credential'

type AdminConfig = {
  email: string
  password: string
}

let initPromise: Promise<void> | undefined

function getConfiguredAdmin(): AdminConfig | null {
  const credentials = env.ADMIN_CREDENTIALS
  if (!credentials) return null

  const separatorIndex = credentials.indexOf(':')
  if (separatorIndex <= 0) {
    throw new Error('[auth] ADMIN_CREDENTIALS must be formatted as email:password')
  }

  const email = credentials.slice(0, separatorIndex).trim().toLowerCase()
  const password = credentials.slice(separatorIndex + 1)

  if (!email || !password) {
    throw new Error('[auth] ADMIN_CREDENTIALS must be formatted as email:password')
  }

  return {
    email,
    password,
  }
}

function getAdminName(email: string) {
  return email.split('@')[0] || email
}

function getAdminUserId(email: string) {
  const digest = createHash('sha256').update(email).digest('hex').slice(0, 24)
  return `admin-${digest}`
}

function getCredentialAccountId(userId: string) {
  return `credential-${userId}`
}

async function isSamePassword(storedPassword: string | null | undefined, password: string) {
  if (!storedPassword) return false

  try {
    return await verifyPassword({ hash: storedPassword, password })
  } catch {
    return false
  }
}

async function upsertConfiguredAdminUser() {
  const admin = getConfiguredAdmin()
  if (!admin) return

  const existingUser = await prisma.user.findUnique({
    where: { email: admin.email },
    select: {
      id: true,
      role: true,
      banned: true,
      banReason: true,
      banExpires: true,
      emailVerified: true,
    },
  })

  const userId = existingUser?.id ?? getAdminUserId(admin.email)

  await prisma.$transaction(async (tx) => {
    if (!existingUser) {
      await tx.user.create({
        data: {
          id: userId,
          name: getAdminName(admin.email),
          email: admin.email,
          emailVerified: true,
          apiToken: generateUserApiToken(),
          role: ADMIN_ROLE,
          banned: false,
        },
      })
    } else if (
      existingUser.role !== ADMIN_ROLE ||
      existingUser.banned ||
      existingUser.banReason !== null ||
      existingUser.banExpires !== null ||
      !existingUser.emailVerified
    ) {
      await tx.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          role: ADMIN_ROLE,
          banned: false,
          banReason: null,
          banExpires: null,
        },
      })
    }

    const credentialAccount = await tx.account.findFirst({
      where: {
        userId,
        providerId: CREDENTIAL_PROVIDER_ID,
      },
      select: {
        id: true,
        accountId: true,
        password: true,
      },
    })

    const matchesPassword = await isSamePassword(credentialAccount?.password, admin.password)

    if (credentialAccount) {
      if (matchesPassword && credentialAccount.accountId === userId) return

      await tx.account.update({
        where: { id: credentialAccount.id },
        data: {
          accountId: userId,
          password: matchesPassword
            ? credentialAccount.password
            : await hashPassword(admin.password),
        },
      })
      return
    }

    const credentialAccountId = getCredentialAccountId(userId)
    const password = await hashPassword(admin.password)

    await tx.account.upsert({
      where: { id: credentialAccountId },
      create: {
        id: credentialAccountId,
        accountId: userId,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId,
        password,
      },
      update: {
        accountId: userId,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId,
        password,
      },
    })
  })
}

export async function ensureConfiguredAdminUser() {
  initPromise ??= upsertConfiguredAdminUser()
  await initPromise
}
