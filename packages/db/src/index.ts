import { env } from '@my-better-t-app/env/server'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../prisma/generated/client'
import { hackVercelForDemo } from './hack_vercel_for_demo'

const adapter = new PrismaLibSql({
  url: env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

await hackVercelForDemo(prisma, env.DATABASE_URL)

export default prisma
