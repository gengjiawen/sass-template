'use client'
import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { trpc } from '@/utils/trpc'

type DashboardProps = {
  apiToken: string
}

export default function Dashboard({ apiToken }: DashboardProps) {
  const { t } = useTranslation()
  const privateData = useQuery(trpc.privateData.queryOptions())

  async function handleCopyApiToken() {
    if (!apiToken) return
    await navigator.clipboard.writeText(apiToken)
  }

  return (
    <div className="mt-4 space-y-4">
      <p>
        {t('API Status')}: {privateData.data?.message}
      </p>

      <div className="max-w-2xl">
        <p className="text-xs leading-none">{t('API token')}</p>
        <div className="mt-1 flex gap-2">
          <code className="border-input bg-muted/40 min-h-8 flex-1 break-all border px-2.5 py-1.5 font-mono text-xs">
            {apiToken}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void handleCopyApiToken()}
            disabled={!apiToken}
            title={t('Copy API token')}
            aria-label={t('Copy API token')}
          >
            <Copy />
          </Button>
        </div>
      </div>
    </div>
  )
}
