'use client'

import { useTranslation } from 'react-i18next'
import { authClient } from '@/lib/auth-client'
import Dashboard from './dashboard'

type DashboardViewProps = {
  apiToken: string
  session: typeof authClient.$Infer.Session
}

export default function DashboardView({ apiToken, session }: DashboardViewProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p>
        {t('Welcome')} {session.user.name}
      </p>
      <Dashboard apiToken={apiToken} />
    </div>
  )
}
