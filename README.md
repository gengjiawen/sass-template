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
- **GitHub Mirror** - Cache GitHub release assets locally and serve them via internal download URLs

## GitHub Mirror

Primarily a **GitHub release mirror**: pass a GitHub releases download URL, the server fetches and caches the file locally, then returns an internal path-style download URL. Other upstream sources are not restricted as long as they follow the same `owner/repo/releases/download/tag/filename` path layout.

### Download

Both path-style URLs and `?url=` query URLs auto-download on first request (fetch from GitHub, cache locally, then serve):

```bash
curl -i -OJ "http://localhost:3000/api/mirror/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip"

curl -i -OJ "http://localhost:3000/api/mirror?url=https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip"
```

Response headers:

- `X-GitHub-Mirror-Cache: hit` — file already cached, no re-download
- `X-GitHub-Mirror-Cache: miss` — file was just downloaded

### Resolve (return download URL as JSON)

Pass a GitHub releases URL and get the internal mirror download URL:

```bash
curl -i -H "Accept: application/json" \
  "http://localhost:3000/api/mirror?url=https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip"
```

Response:

```json
{
  "url": "http://localhost:3000/api/mirror/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip"
}
```

The `url` query parameter accepts either a full GitHub URL or a mirror path such as `BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip`.

Cached files are stored under `GITHUB_MIRROR_DOWNLOAD_DIR`, preserving the same directory structure. Defaults to the system temp directory (`os.tmpdir()`).

Optional `.env`:

```env
GITHUB_MIRROR_DOWNLOAD_DIR=/data/github-mirror
```

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses SQLite with Prisma.

1. Start the local SQLite database (optional):

```bash
pnpm run db:local
```

2. Update your root `.env` file (project root) with the appropriate connection details if needed.  
   `apps/web/.env` is also supported as a fallback.

3. Run the initial migration:

```bash
pnpm run db:migrate
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the fullstack application.

## Git Hooks and Formatting

- Format and lint fix: `pnpm run check`

## Project Structure

```
my-better-t-app/
├── apps/
│   └── web/         # Fullstack application (Next.js)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database (dev convenience)
- `pnpm run db:studio`: Open database studio UI
- `pnpm run db:local`: Start the local SQLite database
- `pnpm run db:migrate:deploy`: Apply committed migrations (production)
- `pnpm run check`: Run Oxlint and Oxfmt
