import prisma from '@my-better-t-app/db'
import { env } from '@my-better-t-app/env/server'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'
import { generateUserApiToken } from './token'

export { ensureConfiguredAdminUser } from './init-admin'
export { generateUserApiToken } from './token'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),

  trustedOrigins: [env.BETTER_AUTH_URL],
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
  plugins: [admin(), nextCookies()],
})
