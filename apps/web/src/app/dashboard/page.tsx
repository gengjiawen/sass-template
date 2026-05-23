import { auth } from '@my-better-t-app/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import DashboardView from './dashboard-view'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  return <DashboardView session={session} />
}
