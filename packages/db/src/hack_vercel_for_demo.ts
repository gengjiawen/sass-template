import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PrismaClient } from '../prisma/generated/client'

const MIGRATIONS_DIR = 'prisma/migrations'
const MIGRATIONS_SEARCH_ROOTS = [
  process.cwd(),
  path.resolve(process.cwd(), 'packages/db'),
  path.resolve(process.cwd(), '../packages/db'),
  path.resolve(process.cwd(), '../../packages/db'),
] as const

function shouldRunRuntimeMigration(databaseUrl: string) {
  return Boolean(process.env.VERCEL) && databaseUrl.startsWith('file:/tmp/')
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => `${statement};`)
}

function findMigrationsDir(): string {
  for (const root of MIGRATIONS_SEARCH_ROOTS) {
    const candidate = path.resolve(root, MIGRATIONS_DIR)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`[db] Cannot find ${MIGRATIONS_DIR} from cwd ${process.cwd()}`)
}

function loadAllMigrationSql(): string[] {
  const migrationsDir = findMigrationsDir()
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()

  const sqls: string[] = []
  for (const dir of entries) {
    const sqlPath = path.join(migrationsDir, dir, 'migration.sql')
    if (existsSync(sqlPath)) {
      sqls.push(readFileSync(sqlPath, 'utf8'))
    }
  }
  return sqls
}

export async function hackVercelForDemo(prisma: PrismaClient, databaseUrl: string) {
  if (!shouldRunRuntimeMigration(databaseUrl)) {
    return
  }

  const migrationSqls = loadAllMigrationSql()

  for (const sql of migrationSqls) {
    const statements = splitSqlStatements(sql)
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement)
      } catch {
        // Ignore errors from idempotent re-runs (e.g. column already exists)
      }
    }
  }
}
