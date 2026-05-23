# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a pnpm monorepo (Next.js + tRPC + Prisma + SQLite + Better-Auth) with the web app in `apps/web/`. No external services are required — the database is a local SQLite file.

### Quick reference

| Task          | Command                        |
| ------------- | ------------------------------ |
| Install deps  | `pnpm install`                 |
| Dev server    | `pnpm run dev:web` (port 3000) |
| Build         | `pnpm run build`               |
| Lint + format | `pnpm run check`               |
| DB migrate    | `pnpm run db:migrate`          |

### Project layout

- **`apps/web/`** — Next.js App Router app (UI, API routes, tRPC server)
- **`packages/auth/`** — Better-Auth configuration
- **`packages/db/`** — Prisma schema, migrations, client
- **`packages/env/`** — Typed environment variables
- **`packages/config/`** — Shared TypeScript config

tRPC lives in `apps/web/src/server/api/` (not a separate `packages/api` package). Client tRPC utils: `apps/web/src/utils/trpc.ts`.

### i18n conventions

- Stack: `i18next` + `react-i18next` + Jotai; init in `apps/web/src/i18n.ts`, wired via `I18nProvider` in `providers.tsx`.
- Locale files: `apps/web/src/locales/en-US.json`, `zh-CN.json` — flat JSON, BCP-47 filenames.
- Supported languages: `en-US`, `zh-CN`; fallback `en-US`. Preference stored in `localStorage` (`app.language`).
- Keys are English UI strings (e.g. `"Sign In"`). Keep keys identical across all locale files.
- Usage: `useTranslation()` and `t('Key')`; avoid hardcoded UI text in components.
- Language switcher is in the header (`LanguageToggle`). Docs content (`/docs`) is English-only for now.

### Fumadocs conventions

- Docs route: `/docs`; site nav title is `docs`.
- MDX content: `apps/web/content/docs/`; config in `apps/web/source.config.ts`.
- Search API: `apps/web/src/app/api/search/route.ts`.

### Code quality

- **Linting**: oxlint (via `pnpm run check`). Config: `.oxlintrc.json`.
- **Formatting**: oxfmt. Config: `.oxfmtrc.json` (`singleQuote`, `semi: false`, `sortImports.newlinesBetween: false`).
- **Git hooks**: Husky pre-commit runs `lint-staged` with `oxfmt --write` on staged files only (no lint on commit). Use `pnpm run check` for full lint + format.

### Important notes

- **pnpm build scripts**: The `pnpm.onlyBuiltDependencies` field in root `package.json` must list packages that need postinstall scripts (prisma, @prisma/engines, esbuild, sharp). Without this, pnpm 10+ blocks their scripts and the build fails on Vercel.
- **`check-types`** is defined in root `package.json` but no workspace packages have that script; it will fail with `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. Use `pnpm run build` to verify type correctness instead.
- **Postinstall** in `apps/web` runs `fumadocs-mdx`, `prisma generate`, and `prisma migrate deploy` automatically — no manual DB setup needed after `pnpm install`.
- **Environment**: `.env` at project root provides all required vars with dev defaults. No secrets needed for local development.
- **GitHub Artifact Mirror**: `/api/mirror`; optional env `GITHUB_MIRROR_DOWNLOAD_DIR` for cache path.
