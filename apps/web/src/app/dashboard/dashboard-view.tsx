'use client';

import { useTranslation } from 'react-i18next';

import { authClient } from '@/lib/auth-client';

import Dashboard from './dashboard';

export default function DashboardView({
  session,
}: {
  session: typeof authClient.$Infer.Session;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('Dashboard')}</h1>
      <p>
        {t('Welcome')} {session.user.name}
      </p>
      <Dashboard session={session} />
    </div>
  );
}
