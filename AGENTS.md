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

### Auth

- Stack: Better-Auth with email/password; API route `/api/auth/[...all]`. Client: `apps/web/src/lib/auth-client.ts`.
- Code: `packages/auth/` (`betterAuth` config, `admin()` plugin). User model adds `apiToken` (auto-generated) and `role` (`user` | `admin`) in `packages/db/prisma/schema/auth.prisma`.
- Optional env `ADMIN_CREDENTIALS` (`email:password`, password ≥ 8 chars): on startup, `packages/auth/src/init-admin.ts` creates or syncs an admin user with that credential.
- UI: `/login` (sign-in/sign-up forms); post-login redirect to `/dashboard`, which shows the signed-in user's `apiToken` for copy (used by NSSurge in production).

### i18n conventions

- Stack: `i18next` + `react-i18next` + Jotai; init in `apps/web/src/i18n.ts`, wired via `I18nProvider` in `providers.tsx`.
- Locale files: `apps/web/src/locales/en-US.json`, `zh-CN.json` — flat JSON, BCP-47 filenames.
- Supported languages: `en-US`, `zh-CN`; fallback `en-US`. Preference stored in `localStorage` (`app.language`).
- Keys are English UI strings (e.g. `"Sign In"`). Keep keys identical across all locale files.
- Usage: `useTranslation()` and `t('Key')`; avoid hardcoded UI text in components.
- Language switcher is in the header (`LanguageToggle`). Docs content (`/docs`) is English-only for now.

### README conventions

- **Language**: English only.
- **Scope**: Feature sections describe what the feature does, not setup steps, env walkthroughs, curl recipes, or operational runbooks.
- **Length**: Keep each feature `##` section to about **100 words** or less (one short paragraph). Put a one-line summary in **Features** with “see below” when needed.
- **Detail elsewhere**: Implementation and agent workflow live in `AGENTS.md` and `plan/`; do not duplicate long docs in `README.md`.

### NSSurge Collector

- Routes: `POST/GET/DELETE /api/nssurge`; `GET/POST /api/nssurge/modules`; `GET/DELETE /api/nssurge/modules/[key]` (`.sgmodule` suffix accepted); dashboard `/nssurge`; Surge scripts `/nssurge/log-request.js`, `/nssurge/log-response.js`.
- Code: `apps/web/src/lib/nssurge/`, `apps/web/src/app/api/nssurge/route.ts`, `apps/web/src/app/api/nssurge/modules/`, `packages/db/prisma/schema/nssurge.prisma`.
- Auth: local development can use the internal NSSurge dev user without a token; production uses each user's `apiToken`. Limits are code constants. Uses existing `DATABASE_URL` via Prisma — no separate SQLite file.
- Spec: `plan/nssurge-collector.md`.

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
- **TypeScript 7 (native `tsc`)**: The `typescript` catalog entry is pure TS 7 (the Go-native compiler), which ships only the `tsc` CLI — the programmatic JS API does not land until TS 7.1. Consequences:
  - Because TS 7.0 has no JS API, Next.js is pinned to the **16.3 preview** (`apps/web/package.json` → `next: 16.3.0-preview.6`) and `apps/web/next.config.ts` sets `experimental.useTypeScriptCli: true`, which makes `next build` invoke the installed `tsc` CLI directly. So `pnpm run build` **does** type-check (via native TS 7). When Next 16.3 ships stable, bump `next` off the preview tag.
  - `useTypeScriptCli` type-checks the whole `apps/web` `tsconfig` include set (test files included) — stricter than the old JS-API path, so keep `.test.ts` files clean too. `apps/web/tsconfig.json` targets `ES2020` (needed for the BigInt literals used in NSSurge tests).
  - Ad-hoc type-check of a single package: `pnpm exec tsc --noEmit` inside it (fast).
- **`check-types`** root script (`pnpm -r check-types`) still fails with `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` because no workspace package defines that script. Use `pnpm run build` (type-checks web via `useTypeScriptCli`) or `pnpm exec tsc --noEmit` in a package.
- **pnpm release-age gate**: `minimumReleaseAge: 0` in `pnpm-workspace.yaml` disables pnpm's new-release cooldown. Without it, `pnpm install` rewrites the workspace file with a large auto-generated `minimumReleaseAgeExclude` list for TS 7's platform binaries.
- **Postinstall** in `apps/web` runs `fumadocs-mdx`, `prisma generate`, and `prisma migrate deploy` automatically — no manual DB setup needed after `pnpm install`.
- **Environment**: `.env` at project root provides all required vars with dev defaults. No secrets needed for local development.
- **GitHub Artifact Mirror**: `/api/mirror`; optional env `GITHUB_MIRROR_DOWNLOAD_DIR` for cache path.
- **Node.js**: Use system Node (`/usr/local/bin`, v22+) for `pnpm`, Prisma, and builds — not Cursor’s bundled Node (v20), which breaks pnpm/Prisma.
