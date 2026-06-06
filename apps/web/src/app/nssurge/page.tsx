import { auth } from '@my-better-t-app/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ensureUserApiToken } from '@/lib/nssurge/auth'
import NssurgeDashboard from './nssurge-dashboard'

export const metadata = {
  title: 'NSSurge Collector',
  description: 'Capture Surge HTTP traffic to Prisma-backed storage',
}

export default async function NssurgePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user && process.env.NODE_ENV === 'production') {
    redirect('/login')
  }

  const apiToken = session?.user ? await ensureUserApiToken(session.user.id) : ''

  return <NssurgeDashboard apiToken={apiToken} isAuthenticated={Boolean(session?.user)} />
}
