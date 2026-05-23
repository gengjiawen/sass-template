# my-better-t-app

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
- **Todos Feature** - Full-stack todo management with create, toggle, and delete operations (kidding, just a CRUD demo)
- **GitHub Artifact Mirror** - Cache GitHub release artifacts locally and serve them via `/api/mirror`

## GitHub Artifact Mirror

Cache GitHub release artifacts and serve them via `/api/mirror`. First request fetches from GitHub; later requests use local cache. Optional `GITHUB_MIRROR_DOWNLOAD_DIR` sets the cache path.

```bash
curl -OJ "http://localhost:3000/api/mirror/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip"
```
