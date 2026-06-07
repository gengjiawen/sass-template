import os from 'node:os'
import path from 'node:path'
import { createEnv } from '@t3-oss/env-core'
import dotenv from 'dotenv'
import { z } from 'zod'

// Support both running from workspace root and from apps/web.
dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
  quiet: true,
})

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  quiet: true,
})

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    GITHUB_MIRROR_DOWNLOAD_DIR: z.string().min(1).default(os.tmpdir()),
    ADMIN_CREDENTIALS: z
      .string()
      .refine((value) => {
        const separatorIndex = value.indexOf(':')
        if (separatorIndex <= 0) return false

        const email = value.slice(0, separatorIndex).trim()
        const password = value.slice(separatorIndex + 1)
        return z.email().safeParse(email).success && password.length >= 8
      }, 'ADMIN_CREDENTIALS must be formatted as email:password with a password of at least 8 characters')
      .optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
