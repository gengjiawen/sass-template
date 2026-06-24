'use client'

import { Copy, Download, Link, Pause, Play, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShikiCodeBlock } from '@/components/shiki-code-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exchangeToCurl } from '@/lib/nssurge/curl'
import { generateSurgeModule, parseDomains } from '@/lib/nssurge/module'
import type { NssurgeExchange } from '@/lib/nssurge/repository'
import { cn } from '@/lib/utils'

const LIMIT_OPTIONS = [100, 200, 500, 1000] as const

const EXCHANGE_LIST_GRID =
  'grid grid-cols-[3rem_3.5rem_minmax(0,1fr)_2.75rem_4rem] items-start gap-x-2'

type ExchangesResponse = {
  view: string
  items: NssurgeExchange[]
}

type NssurgeDashboardProps = {
  apiToken: string
  isAuthenticated: boolean
}

function formatTime(ms: number | null, empty = '—'): string {
  if (ms == null) return empty
  return new Date(ms).toLocaleString()
}

function formatTimeHms(ms: number | null, empty = '—'): string {
  if (ms == null) return empty
  const d = new Date(ms)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** Surge `$request.id` is often `sessionPrefix-localId`; list shows the short suffix. */
function formatSurgeRequestIdDisplay(surgeRequestId: string): string {
  const dash = surgeRequestId.lastIndexOf('-')
  if (dash === -1 || dash === surgeRequestId.length - 1) return surgeRequestId
  return surgeRequestId.slice(dash + 1)
}

function formatDuration(requestMs: number | null, responseMs: number | null, empty = '—'): string {
  if (requestMs == null || responseMs == null) return empty
  const delta = responseMs - requestMs
  if (delta < 0) return empty
  if (delta < 1000) return `${delta}ms`
  if (delta < 60_000) return `${(delta / 1000).toFixed(1)}s`
  return `${(delta / 60_000).toFixed(1)}m`
}

function statusClass(status: number | null): string {
  if (status == null) return 'text-muted-foreground'
  if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400'
  if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400'
  if (status >= 400 && status < 500) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function parseListUrlPath(url: string): string {
  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return path || '/'
  } catch {
    return url
  }
}

function resolveListUrlHost(url: string, host: string | null): string | null {
  if (host) return host
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

function ExchangeUrlCell({
  url,
  host,
  method,
}: {
  url: string
  host: string | null
  method: string | null
}) {
  const path = useMemo(() => parseListUrlPath(url), [url])
  const displayHost = useMemo(() => resolveListUrlHost(url, host), [url, host])

  return (
    <span className="min-w-0 font-mono text-xs leading-snug">
      <span className="line-clamp-2 break-all">
        {method ? (
          <>
            <span className="font-semibold text-muted-foreground">{method}</span>{' '}
          </>
        ) : null}
        {path}
      </span>
      {displayHost ? (
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
          {displayHost}
        </span>
      ) : null}
    </span>
  )
}

function BodyPanel({
  label,
  bodyKind,
  bodyText,
  byteLength,
  skippedReason,
}: {
  label: string
  bodyKind: string | null
  bodyText?: string | null
  byteLength: number | null
  skippedReason: string | null
}) {
  const { t } = useTranslation()
  const [pretty, setPretty] = useState(true)
  const empty = t('—')

  const isJsonLike = useMemo(() => {
    if (!bodyText) return false
    const t = bodyText.trim()
    return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))
  }, [bodyText])

  const displayText = useMemo(() => {
    if (!bodyText) return ''
    if (!pretty || !isJsonLike) return bodyText
    try {
      return JSON.stringify(JSON.parse(bodyText), null, 2)
    } catch {
      return bodyText
    }
  }, [bodyText, pretty, isJsonLike])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span>
        <span>{t('kind: {{kind}}', { kind: bodyKind ?? empty })}</span>
        {byteLength != null && <span>{t('{{count}} bytes', { count: byteLength })}</span>}
        {skippedReason && <span>{t('reason: {{reason}}', { reason: skippedReason })}</span>}
        {isJsonLike && bodyText && (
          <Button type="button" variant="outline" size="xs" onClick={() => setPretty((v) => !v)}>
            {pretty ? t('Raw') : t('Pretty')}
          </Button>
        )}
      </div>
      {bodyKind === 'binary_skipped' ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('Binary body skipped')}</p>
      ) : bodyText ? (
        isJsonLike ? (
          <ShikiCodeBlock code={displayText} className="max-h-80" />
        ) : (
          <pre className="max-h-80 overflow-auto rounded border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap break-all">
            {displayText}
          </pre>
        )
      ) : (
        <p className="text-sm text-muted-foreground">{t('No body')}</p>
      )}
    </div>
  )
}

function ExchangeListHeader() {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        EXCHANGE_LIST_GRID,
        'border-b border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground',
      )}
    >
      <span>{t('ID')}</span>
      <span>{t('Time')}</span>
      <span>{t('URL')}</span>
      <span className="text-right">{t('Status')}</span>
      <span className="text-right">{t('Duration')}</span>
    </div>
  )
}

function ExchangeRow({
  exchange,
  selected,
  onSelect,
}: {
  exchange: NssurgeExchange
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const empty = t('—')
  const capturedAtMs = exchange.responseCapturedAtMs ?? exchange.requestCapturedAtMs

  return (
    <button
      type="button"
      onClick={onSelect}
      title={exchange.url}
      className={cn(
        EXCHANGE_LIST_GRID,
        'w-full border-b border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40',
        selected && 'border-l-2 border-l-primary bg-primary/10 hover:bg-primary/15',
      )}
    >
      <span
        className="truncate pt-0.5 font-mono text-xs tabular-nums text-muted-foreground"
        title={exchange.surgeRequestId}
      >
        {formatSurgeRequestIdDisplay(exchange.surgeRequestId)}
      </span>
      <span className="font-mono text-xs tabular-nums">{formatTimeHms(capturedAtMs, empty)}</span>
      <ExchangeUrlCell url={exchange.url} host={exchange.host} method={exchange.method} />
      <span
        className={cn(
          'pt-0.5 text-right font-mono text-xs font-semibold tabular-nums',
          statusClass(exchange.responseStatus),
        )}
      >
        {exchange.responseStatus ?? empty}
      </span>
      <span className="pt-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {formatDuration(exchange.requestCapturedAtMs, exchange.responseCapturedAtMs, empty)}
      </span>
    </button>
  )
}

function ExchangeDetailPanel({
  exchange,
  detail,
  loadingDetail,
}: {
  exchange: NssurgeExchange
  detail: NssurgeExchange | null
  loadingDetail: boolean
}) {
  const { t } = useTranslation()
  const data = detail ?? exchange
  const empty = t('—')

  const handleCopyCurl = async () => {
    const curl = exchangeToCurl(data)
    if (!curl) return
    await navigator.clipboard.writeText(curl)
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <div className="space-y-2 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-xs break-all text-muted-foreground">{data.url}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold">{data.method ?? empty}</span>
              <span
                className={cn(
                  'font-mono font-semibold tabular-nums',
                  statusClass(data.responseStatus),
                )}
              >
                {data.responseStatus ?? empty}
              </span>
              <span className="text-muted-foreground">
                {formatDuration(data.requestCapturedAtMs, data.responseCapturedAtMs, empty)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={loadingDetail}
            onClick={() => void handleCopyCurl()}
          >
            <Copy />
            {t('Copy as cURL')}
          </Button>
        </div>
      </div>

      {loadingDetail && <p className="text-xs text-muted-foreground">{t('Loading bodies…')}</p>}

      <div className="grid gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          {t('Request captured: {{time}}', {
            time: formatTime(data.requestCapturedAtMs, empty),
          })}
        </div>
        <div>
          {t('Response captured: {{time}}', {
            time: formatTime(data.responseCapturedAtMs, empty),
          })}
        </div>
        <div className="flex min-w-0 items-center sm:col-span-2">
          {t('ID: {{id}}', { id: data.surgeRequestId })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t('Request')}
          </h3>
          {data.requestHeadersJson && (
            <div>
              <p className="mb-1 text-xs font-medium">{t('Request headers')}</p>
              <ShikiCodeBlock
                code={JSON.stringify(JSON.parse(data.requestHeadersJson), null, 2)}
                className="max-h-40"
              />
            </div>
          )}
          <BodyPanel
            label={t('Request body')}
            bodyKind={data.requestBodyKind}
            bodyText={data.requestBodyText}
            byteLength={data.requestBodyByteLength}
            skippedReason={data.requestBodySkippedReason}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t('Response')}
          </h3>
          {data.responseHeadersJson && (
            <div>
              <p className="mb-1 text-xs font-medium">{t('Response headers')}</p>
              <ShikiCodeBlock
                code={JSON.stringify(JSON.parse(data.responseHeadersJson), null, 2)}
                className="max-h-40"
              />
            </div>
          )}
          <BodyPanel
            label={t('Response body')}
            bodyKind={data.responseBodyKind}
            bodyText={data.responseBodyText}
            byteLength={data.responseBodyByteLength}
            skippedReason={data.responseBodySkippedReason}
          />
        </div>
      </div>
    </div>
  )
}

export default function NssurgeDashboard({ apiToken, isAuthenticated }: NssurgeDashboardProps) {
  const { t } = useTranslation()
  const [origin, setOrigin] = useState('')
  const [items, setItems] = useState<NssurgeExchange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [limit, setLimit] = useState<number>(100)
  const [hostFilter, setHostFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailById, setDetailById] = useState<Record<string, NssurgeExchange>>({})
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)

  const [domainsInput, setDomainsInput] = useState('https://tooling-one.vercel.app/httpbin')
  const [includeSubdomains, setIncludeSubdomains] = useState(false)
  const [protocol, setProtocol] = useState<'https' | 'http' | 'both'>('https')
  const [collectorEndpoint, setCollectorEndpoint] = useState('')
  const [scriptBaseUrl, setScriptBaseUrl] = useState('')
  const [maxSize, setMaxSize] = useState(1_048_576)
  const [timeoutSeconds, setTimeoutSeconds] = useState(1)
  const [enableMitm, setEnableMitm] = useState(true)
  const [moduleText, setModuleText] = useState('')
  const [activeTab, setActiveTab] = useState<'requests' | 'module'>('requests')

  const [savingModule, setSavingModule] = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [savedModules, setSavedModules] = useState<
    Array<{
      key: string
      url: string
      createdAt: string
      updatedAt: string
    }>
  >([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)

  useEffect(() => {
    const base = window.location.origin
    setOrigin(base)
    setCollectorEndpoint(`${base}/api/nssurge`)
    setScriptBaseUrl(`${base}/nssurge`)
  }, [])

  const isLocalhost = useMemo(() => {
    try {
      const host = new URL(origin || 'http://localhost').hostname
      return host === 'localhost' || host === '127.0.0.1'
    } catch {
      return false
    }
  }, [origin])

  const fetchExchanges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        view: 'exchanges',
        limit: String(limit),
        withBody: 'false',
      })
      if (hostFilter) params.set('host', hostFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (q) params.set('q', q)

      const res = await fetch(`/api/nssurge?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as ExchangesResponse
      setItems(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Failed to load'))
    } finally {
      setLoading(false)
    }
  }, [hostFilter, limit, q, statusFilter, t])

  const fetchExchangeDetail = useCallback(async (surgeRequestId: string) => {
    setLoadingDetailId(surgeRequestId)
    try {
      const params = new URLSearchParams({
        view: 'exchanges',
        withBody: 'true',
        surgeRequestId,
      })
      const res = await fetch(`/api/nssurge?${params}`)
      if (!res.ok) return
      const data = (await res.json()) as ExchangesResponse
      const match = data.items.find((i) => i.surgeRequestId === surgeRequestId)
      if (match) {
        setDetailById((prev) => ({ ...prev, [surgeRequestId]: match }))
      }
    } finally {
      setLoadingDetailId(null)
    }
  }, [])

  useEffect(() => {
    if (!origin) return
    void fetchExchanges()
  }, [fetchExchanges, origin])

  useEffect(() => {
    if (!autoRefresh || !origin) return
    const id = window.setInterval(() => {
      void fetchExchanges()
    }, 2000)
    return () => window.clearInterval(id)
  }, [autoRefresh, fetchExchanges, origin])

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null)
      return
    }
    setSelectedId(id)
    if (!detailById[id]) void fetchExchangeDetail(id)
  }

  const selectedExchange = useMemo(() => {
    if (!selectedId) return null
    return items.find((i) => i.surgeRequestId === selectedId) ?? detailById[selectedId] ?? null
  }, [selectedId, items, detailById])

  const handleGenerateModule = () => {
    const domains = parseDomains(domainsInput)
    const text = generateSurgeModule({
      domainsInput,
      domains,
      includeSubdomains,
      collectorEndpoint,
      token: apiToken,
      scriptBaseUrl,
      maxSize,
      timeoutSeconds,
      enableMitm,
      protocol,
    })
    setModuleText(text)
    setSavedUrl(null)
  }

  const handleCopyModule = async () => {
    if (!moduleText) return
    await navigator.clipboard.writeText(moduleText)
  }

  const handleCopyApiToken = async () => {
    if (!apiToken) return
    await navigator.clipboard.writeText(apiToken)
  }

  const handleDownloadModule = () => {
    if (!moduleText) return
    const blob = new Blob([moduleText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nssurge-collector.sgmodule'
    a.click()
    URL.revokeObjectURL(url)
  }

  const fetchSavedModules = useCallback(async () => {
    setLoadingSaved(true)
    setSavedError(null)
    try {
      const res = await fetch('/api/nssurge/modules')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { items: typeof savedModules }
      setSavedModules(data.items)
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : t('Failed to load modules'))
    } finally {
      setLoadingSaved(false)
    }
  }, [t])

  useEffect(() => {
    if (activeTab === 'module' && origin) void fetchSavedModules()
  }, [activeTab, origin, fetchSavedModules])

  const handleSaveModule = async () => {
    if (!moduleText) return
    setSavingModule(true)
    setSavedUrl(null)
    setSavedError(null)
    try {
      const res = await fetch('/api/nssurge/modules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: moduleText }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { key: string; url: string }
      await navigator.clipboard.writeText(`${origin}${data.url}`)
      setSavedUrl(`${origin}${data.url}`)
      await fetchSavedModules()
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : t('Failed to save module'))
    } finally {
      setSavingModule(false)
    }
  }

  const handleDeleteModule = async (key: string) => {
    setSavedError(null)
    try {
      const res = await fetch(`/api/nssurge/modules/${key}.sgmodule`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setSavedModules((prev) => prev.filter((m) => m.key !== key))
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : t('Failed to delete module'))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('NSSurge Collector')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Capture Surge HTTP request/response text bodies into Prisma via')}{' '}
          <code className="text-xs">/api/nssurge</code>.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {t(
            'Local development mode is using an internal NSSurge dev user. Sign in to generate a user-specific API token.',
          )}
        </div>
      )}

      {isLocalhost && (
        <div className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {t('iPhone Surge cannot reach')} <strong>127.0.0.1</strong>{' '}
          {t("on your Mac. Use your Mac's LAN IP in collector endpoint and script URLs (e.g.")}{' '}
          <code className="text-xs">http://192.168.1.23:3000/api/nssurge</code>).
        </div>
      )}

      <Card>
        <CardHeader className="pb-0">
          <div className="flex gap-1 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'requests'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t('Request list')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('module')}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'module'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t('Generate Surge module')}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pt-0">
          {activeTab === 'requests' && (
            <>
              <div className="flex flex-wrap items-end gap-2 px-3 pb-3">
                <div className="min-w-[12rem] flex-1">
                  <Label htmlFor="q">{t('URL search')}</Label>
                  <Input
                    id="q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t('contains…')}
                  />
                </div>
                <div>
                  <Label htmlFor="host">{t('Host')}</Label>
                  <Input
                    id="host"
                    value={hostFilter}
                    onChange={(e) => setHostFilter(e.target.value)}
                    placeholder="api.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="status">{t('Status')}</Label>
                  <Input
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    placeholder="200"
                  />
                </div>
                <div>
                  <Label htmlFor="limit">{t('Limit')}</Label>
                  <select
                    id="limit"
                    className="h-8 w-full min-w-20 border bg-background px-2 text-xs"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    {LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchExchanges()}
                >
                  <RefreshCw className={cn(loading && 'animate-spin')} />
                  {t('Refresh')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh((v) => !v)}
                >
                  {autoRefresh ? <Pause /> : <Play />}
                  {autoRefresh ? t('Pause') : t('Resume')}
                </Button>
              </div>

              {error && <p className="px-3 text-sm text-destructive">{error}</p>}

              <div className="flex min-h-[28rem] flex-col border-t lg:min-h-[calc(100vh-14rem)] lg:flex-row">
                <div className="flex min-h-0 flex-col lg:w-[min(100%,32rem)] lg:shrink-0 lg:border-r">
                  <div className="min-h-0 flex-1 overflow-auto lg:max-h-[calc(100vh-14rem)]">
                    {items.length === 0 && !loading && (
                      <p className="p-4 text-sm text-muted-foreground">
                        {t('No exchanges yet. POST events via Surge or curl.')}
                      </p>
                    )}
                    {items.length > 0 && <ExchangeListHeader />}
                    {items.map((item) => (
                      <ExchangeRow
                        key={item.surgeRequestId}
                        exchange={item}
                        selected={selectedId === item.surgeRequestId}
                        onSelect={() => handleSelect(item.surgeRequestId)}
                      />
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto border-t lg:max-h-[calc(100vh-14rem)] lg:border-t-0">
                  {selectedExchange ? (
                    <ExchangeDetailPanel
                      exchange={selectedExchange}
                      detail={selectedId ? (detailById[selectedId] ?? null) : null}
                      loadingDetail={selectedId != null && loadingDetailId === selectedId}
                    />
                  ) : (
                    <div className="flex h-full min-h-48 items-center justify-center p-6">
                      <p className="text-sm text-muted-foreground">
                        {t('Select a request to view details')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'module' && (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="domains">{t('Domains (comma or newline)')}</Label>
                  <textarea
                    id="domains"
                    className="mt-1 min-h-20 w-full border bg-background px-2 py-1 font-mono text-xs"
                    value={domainsInput}
                    onChange={(e) => setDomainsInput(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="subdomains"
                    checked={includeSubdomains}
                    onCheckedChange={(v) => setIncludeSubdomains(v === true)}
                  />
                  <Label htmlFor="subdomains">{t('Include subdomains')}</Label>
                </div>
                <div>
                  <Label htmlFor="protocol">{t('Protocol')}</Label>
                  <select
                    id="protocol"
                    className="mt-1 h-8 w-full border bg-background px-2 text-xs"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as 'https' | 'http' | 'both')}
                  >
                    <option value="https">https</option>
                    <option value="http">http</option>
                    <option value="both">both</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="endpoint">{t('Collector endpoint')}</Label>
                  <Input
                    id="endpoint"
                    value={collectorEndpoint}
                    onChange={(e) => setCollectorEndpoint(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="scriptBase">{t('Script base URL')}</Label>
                  <Input
                    id="scriptBase"
                    value={scriptBaseUrl}
                    onChange={(e) => setScriptBaseUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="token">{t('API token')}</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="token"
                      value={apiToken}
                      readOnly
                      placeholder={t('Optional on local development')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => void handleCopyApiToken()}
                      disabled={!apiToken}
                      title={t('Copy API token')}
                    >
                      <Copy />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="maxSize">{t('Max body size')}</Label>
                  <Input
                    id="maxSize"
                    type="number"
                    value={maxSize}
                    onChange={(e) => setMaxSize(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="timeout">{t('Timeout (seconds)')}</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mitm"
                    checked={enableMitm}
                    onCheckedChange={(v) => setEnableMitm(v === true)}
                  />
                  <Label htmlFor="mitm">{t('Enable MITM hostname')}</Label>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {t(
                  'HTTPS bodies require MITM hostname and a trusted CA on the device. Avoid enabling',
                )}{' '}
                <code>requires-body=true</code> {t('globally — scope domains narrowly.')}
              </p>

              <Button type="button" onClick={handleGenerateModule}>
                {t('Generate .sgmodule')}
              </Button>

              {moduleText && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyModule()}
                    >
                      <Copy />
                      {t('Copy')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadModule}
                    >
                      <Download />
                      {t('Download')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSaveModule()}
                      disabled={savingModule || !moduleText}
                    >
                      <Link />
                      {savingModule ? t('Saving…') : t('Save & Copy URL')}
                    </Button>
                  </div>
                  {savedUrl && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">{t('Saved: ')}</span>
                      <code className="font-mono text-green-600 dark:text-green-400 break-all">
                        {savedUrl}
                      </code>
                    </p>
                  )}
                  <pre className="max-h-80 overflow-auto rounded border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
                    {moduleText}
                  </pre>
                </div>
              )}

              {savedError && <p className="text-xs text-destructive">{savedError}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
