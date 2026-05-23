import { createContext } from '@/server/api/context';
import { appRouter } from '@/server/api/root';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req.headers),
  });
}
export { handler as GET, handler as POST };
