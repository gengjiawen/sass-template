'use client'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'

export default function Home() {
  const { t } = useTranslation()
  const healthCheck = useQuery(trpc.healthCheck.queryOptions())

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">hello</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">{t('API Status')}</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-muted-foreground">
              {healthCheck.isLoading
                ? t('Checking...')
                : healthCheck.data
                  ? t('Connected')
                  : t('Disconnected')}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
