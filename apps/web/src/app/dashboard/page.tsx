import { auth } from '@my-better-t-app/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ensureUserApiToken } from '@/lib/nssurge/auth'
import DashboardView from './dashboard-view'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const apiToken = await ensureUserApiToken(session.user.id)

  return <DashboardView apiToken={apiToken} session={session} />
}
