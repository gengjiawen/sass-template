import { readFileSync } from "node:fs";
import type { PrismaClient } from "../prisma/generated/client";

const INIT_MIGRATION_FILE = new URL(
  "../prisma/migrations/20260305114350_init/migration.sql",
  import.meta.url,
);

function shouldRunRuntimeMigration(databaseUrl: string) {
  return Boolean(process.env.VERCEL) && databaseUrl.startsWith("file:/tmp/");
}

function makeSqlIdempotent(sql: string) {
  return sql
    .replace(/^CREATE TABLE /gm, "CREATE TABLE IF NOT EXISTS ")
    .replace(/^CREATE UNIQUE INDEX /gm, "CREATE UNIQUE INDEX IF NOT EXISTS ")
    .replace(/^CREATE INDEX /gm, "CREATE INDEX IF NOT EXISTS ");
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => `${statement};`);
}

export async function hackVercelForDemo(prisma: PrismaClient, databaseUrl: string) {
  if (!shouldRunRuntimeMigration(databaseUrl)) {
    return;
  }

  const migrationSql = readFileSync(INIT_MIGRATION_FILE, "utf8");
  const statements = splitSqlStatements(makeSqlIdempotent(migrationSql));

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}
