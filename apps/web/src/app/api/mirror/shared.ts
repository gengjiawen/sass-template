import { env } from '@my-better-t-app/env/server';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

export const GITHUB_BASE_URL = 'https://github.com';
export const GITHUB_RELEASE_PATH =
  /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/releases\/download\/.+/;
export const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

export const EXAMPLE_MIRROR_URL =
  'https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip';

export function parseMirrorPath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    if (!GITHUB_HOSTS.has(parsed.hostname)) return null;

    const mirrorPath = parsed.pathname.replace(/^\/+/, '');
    return isValidMirrorPath(mirrorPath) ? mirrorPath : null;
  }

  const mirrorPath = trimmed.replace(/^\/+/, '');
  return isValidMirrorPath(mirrorPath) ? mirrorPath : null;
}

export function isValidMirrorPath(mirrorPath: string): boolean {
  if (!mirrorPath || mirrorPath.includes('..')) return false;
  return GITHUB_RELEASE_PATH.test(mirrorPath);
}

export function resolveLocalPath(mirrorPath: string): string | null {
  if (!isValidMirrorPath(mirrorPath)) return null;

  const cacheRoot = path.resolve(env.GITHUB_MIRROR_DOWNLOAD_DIR);
  const localPath = path.resolve(path.join(cacheRoot, mirrorPath));

  if (localPath !== cacheRoot && !localPath.startsWith(`${cacheRoot}${path.sep}`)) {
    return null;
  }

  return localPath;
}

export function buildDownloadUrl(request: Request, mirrorPath: string): string {
  return new URL(`/api/mirror/${mirrorPath}`, request.url).toString();
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

export async function ensureCached(
  mirrorPath: string,
): Promise<{ cached: boolean; localPath: string } | Response> {
  const localPath = resolveLocalPath(mirrorPath);
  if (!localPath) {
    return Response.json({ error: 'Invalid mirror path' }, { status: 400 });
  }

  const cached = await fileExists(localPath);
  if (cached) {
    return { cached: true, localPath };
  }

  const upstreamUrl = `${GITHUB_BASE_URL}/${mirrorPath}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'sass-template-mirror/1.0',
      },
    });
  } catch {
    return Response.json({ error: 'Failed to reach upstream mirror' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      {
        error: 'Upstream download failed',
        status: upstream.status,
        upstream: upstreamUrl,
      },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const partialPath = `${localPath}.partial`;

  try {
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await pipeline(
      upstream.body as unknown as NodeJS.ReadableStream,
      createWriteStream(partialPath),
    );
    await fs.rename(partialPath, localPath);
  } catch {
    await fs.rm(partialPath, { force: true });
    return Response.json({ error: 'Failed to save download' }, { status: 500 });
  }

  return { cached: false, localPath };
}

export async function streamCachedFile(
  localPath: string,
  mirrorPath: string,
  cacheHeader: Record<string, string>,
) {
  let stat;
  try {
    stat = await fs.stat(localPath);
  } catch {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  if (!stat.isFile() || stat.size === 0) {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  const file = await fs.open(localPath, 'r');
  const filename = mirrorPath.split('/').at(-1) ?? 'download';

  return new Response(file.readableWebStream() as ReadableStream, {
    headers: {
      ...cacheHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
