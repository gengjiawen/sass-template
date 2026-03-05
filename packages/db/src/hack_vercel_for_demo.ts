import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "../prisma/generated/client";

const INIT_MIGRATION_RELATIVE_PATH = "prisma/migrations/20260305114350_init/migration.sql";
const INIT_MIGRATION_SEARCH_PATHS = [
  path.resolve(process.cwd(), INIT_MIGRATION_RELATIVE_PATH),
  path.resolve(process.cwd(), "packages/db", INIT_MIGRATION_RELATIVE_PATH),
  path.resolve(process.cwd(), "../packages/db", INIT_MIGRATION_RELATIVE_PATH),
  path.resolve(process.cwd(), "../../packages/db", INIT_MIGRATION_RELATIVE_PATH),
] as const;

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

function loadInitMigrationSql() {
  const migrationPath = INIT_MIGRATION_SEARCH_PATHS.find((candidatePath) =>
    existsSync(candidatePath),
  );
  if (!migrationPath) {
    throw new Error(
      `[db] Cannot find ${INIT_MIGRATION_RELATIVE_PATH} from cwd ${process.cwd()}`,
    );
  }

  return readFileSync(migrationPath, "utf8");
}

export async function hackVercelForDemo(prisma: PrismaClient, databaseUrl: string) {
  if (!shouldRunRuntimeMigration(databaseUrl)) {
    return;
  }

  const migrationSql = loadInitMigrationSql();
  const statements = splitSqlStatements(makeSqlIdempotent(migrationSql));

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}
