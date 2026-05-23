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
