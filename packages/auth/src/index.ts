import { randomBytes } from 'node:crypto'
import prisma from '@my-better-t-app/db'
import { env } from '@my-better-t-app/env/server'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'

export function generateUserApiToken(): string {
  return `nss_${randomBytes(32).toString('hex')}`
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),

  trustedOrigins: [env.CORS_ORIGIN],
  user: {
    additionalFields: {
      apiToken: {
        type: 'string',
        required: true,
        input: false,
        returned: false,
        unique: true,
        defaultValue: generateUserApiToken,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
})
