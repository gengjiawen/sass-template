# my sass template

[![Docker](https://github.com/gengjiawen/sass-template/actions/workflows/docker.yml/badge.svg)](https://github.com/gengjiawen/sass-template/actions/workflows/docker.yml)

```bash
docker run -p 3000:3000 ghcr.io/gengjiawen/sass
```

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **tRPC** - End-to-end type-safe APIs
- **Prisma** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Fumadocs** - Beautiful documentation system with MDX support
- **i18n** - Client-side `en-US` / `zh-CN` UI via i18next and Jotai, switchable from the header
- **Todo CRUD** - Full-stack create, read, update, and delete example
- **GitHub Artifact Mirror** - Cache GitHub release artifacts locally and serve them via `/api/mirror`
- **NSSurge Collector** - Capture Surge HTTP traffic (see below)

## Fumadocs

Documentation site at `/docs`, powered by Fumadocs. Add MDX pages under `apps/web/content/docs` — supports search, Mermaid diagrams, and OG images.

## Todo CRUD

A minimal full-stack CRUD example at `/todos`: create, list, toggle completion, and delete items via tRPC and Prisma.

## GitHub Artifact Mirror

Cache GitHub release artifacts and serve them via `/api/mirror`. First request fetches from GitHub; later requests use local cache. Optional `GITHUB_MIRROR_DOWNLOAD_DIR` sets the cache path.

Note: Some regions may have restricted GitHub access — see [os-init Mihomo setup](https://github.com/gengjiawen/os-init#generate-mihomo-config) if needed.

```bash
curl -OJ "http://localhost:3000/api/mirror/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip"
```

## NSSurge Collector

Surge scripts POST HTTP request/response events (text bodies only) to `/api/nssurge` for Prisma storage. Browse traffic and generate `.sgmodule` files at `/nssurge`; local development can run without a token, while production uses each user's API token. Binary bodies are skipped.
