# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a pnpm monorepo (Next.js + tRPC + Prisma + SQLite) with the web app in `apps/web/`. No external services are required — the database is a local SQLite file.

### Quick reference

| Task          | Command                        |
| ------------- | ------------------------------ |
| Install deps  | `pnpm install`                 |
| Dev server    | `pnpm run dev:web` (port 3000) |
| Build         | `pnpm run build`               |
| Lint + format | `pnpm run check`               |
| DB migrate    | `pnpm run db:migrate`          |

### Important notes

- **pnpm build scripts**: The `pnpm.onlyBuiltDependencies` field in root `package.json` must list packages that need postinstall scripts (prisma, @prisma/engines, esbuild, sharp). Without this, pnpm 10+ blocks their scripts and the build fails on Vercel.
- **`pnpm run check`** runs `oxlint && oxfmt --write` — it auto-formats files in place. Run it before committing after upgrading oxfmt.
- **Git hooks**: Husky runs `lint-staged` on pre-commit to format staged files with oxfmt.
- **`check-types`** is defined in root `package.json` but no workspace packages have that script; it will fail with `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. Use `pnpm run build` to verify type correctness instead.
- **Postinstall** in `apps/web` runs `fumadocs-mdx`, `prisma generate`, and `prisma migrate deploy` automatically — no manual DB setup needed after `pnpm install`.
- **Environment**: `.env` at project root provides all required vars with dev defaults. No secrets needed for local development.
