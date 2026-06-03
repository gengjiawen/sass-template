'use client'

import { Copy, Download, Pause, Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateSurgeModule, parseDomains } from '@/lib/nssurge/module'
import type { NssurgeExchange } from '@/lib/nssurge/repository'
import { cn } from '@/lib/utils'

const TOKEN_STORAGE_KEY = 'nssurge.collector.token'
const LIMIT_OPTIONS = [100, 200, 500, 1000] as const

type ExchangesResponse = {
  view: string
  items: NssurgeExchange[]
}

function formatTime(ms: number | null): string {
  if (ms == null) return '—'
  return new Date(ms).toLocaleString()
}

function statusClass(status: number | null): string {
  if (status == null) return 'text-muted-foreground'
  if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400'
  if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400'
  if (status >= 400 && status < 500) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
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
  const [pretty, setPretty] = useState(true)

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
        <span>kind: {bodyKind ?? '—'}</span>
        {byteLength != null && <span>{byteLength} bytes</span>}
        {skippedReason && <span>reason: {skippedReason}</span>}
        {isJsonLike && bodyText && (
          <Button type="button" variant="outline" size="xs" onClick={() => setPretty((v) => !v)}>
            {pretty ? 'Raw' : 'Pretty'}
          </Button>
        )}
      </div>
      {bodyKind === 'binary_skipped' ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">Binary body skipped</p>
      ) : bodyText ? (
        <pre className="max-h-64 overflow-auto rounded border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap break-all">
          {displayText}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No body</p>
      )}
    </div>
  )
}

function ExchangeRow({
  exchange,
  expanded,
  onToggle,
  detail,
  loadingDetail,
}: {
  exchange: NssurgeExchange
  expanded: boolean
  onToggle: () => void
  detail: NssurgeExchange | null
  loadingDetail: boolean
}) {
  const data = detail ?? exchange

  return (
    <div className="border-b border-border/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3"
      >
        <span className="shrink-0 font-mono text-xs font-semibold">{data.method ?? '—'}</span>
        <span
          className={cn(
            'shrink-0 font-mono text-xs font-semibold',
            statusClass(data.responseStatus),
          )}
        >
          {data.responseStatus ?? '—'}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{data.url}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{data.host ?? '—'}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatTime(data.responseCapturedAtMs ?? data.requestCapturedAtMs)}
        </span>
      </button>
      {expanded && (
        <div className="space-y-4 border-t bg-muted/20 px-3 py-3 text-sm">
          {loadingDetail && <p className="text-muted-foreground">Loading bodies…</p>}
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>Request captured: {formatTime(data.requestCapturedAtMs)}</div>
            <div>Response captured: {formatTime(data.responseCapturedAtMs)}</div>
            <div className="sm:col-span-2">ID: {data.surgeRequestId}</div>
          </div>
          {data.requestHeadersJson && (
            <div>
              <p className="mb-1 text-xs font-medium">Request headers</p>
              <pre className="max-h-40 overflow-auto rounded border bg-background p-2 font-mono text-xs">
                {JSON.stringify(JSON.parse(data.requestHeadersJson), null, 2)}
              </pre>
            </div>
          )}
          {data.responseHeadersJson && (
            <div>
              <p className="mb-1 text-xs font-medium">Response headers</p>
              <pre className="max-h-40 overflow-auto rounded border bg-background p-2 font-mono text-xs">
                {JSON.stringify(JSON.parse(data.responseHeadersJson), null, 2)}
              </pre>
            </div>
          )}
          <BodyPanel
            label="Request body"
            bodyKind={data.requestBodyKind}
            bodyText={data.requestBodyText}
            byteLength={data.requestBodyByteLength}
            skippedReason={data.requestBodySkippedReason}
          />
          <BodyPanel
            label="Response body"
            bodyKind={data.responseBodyKind}
            bodyText={data.responseBodyText}
            byteLength={data.responseBodyByteLength}
            skippedReason={data.responseBodySkippedReason}
          />
        </div>
      )}
    </div>
  )
}

export default function NssurgeDashboard() {
  const [origin, setOrigin] = useState('')
  const [items, setItems] = useState<NssurgeExchange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [limit, setLimit] = useState<number>(100)
  const [hostFilter, setHostFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailById, setDetailById] = useState<Record<string, NssurgeExchange>>({})
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)

  const [domainsInput, setDomainsInput] = useState('api.example.com')
  const [includeSubdomains, setIncludeSubdomains] = useState(false)
  const [protocol, setProtocol] = useState<'https' | 'http' | 'both'>('https')
  const [collectorEndpoint, setCollectorEndpoint] = useState('')
  const [scriptBaseUrl, setScriptBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [maxSize, setMaxSize] = useState(1_048_576)
  const [timeoutSeconds, setTimeoutSeconds] = useState(1)
  const [enableMitm, setEnableMitm] = useState(true)
  const [moduleText, setModuleText] = useState('')

  useEffect(() => {
    const base = window.location.origin
    setOrigin(base)
    setCollectorEndpoint(`${base}/api/nssurge`)
    setScriptBaseUrl(`${base}/nssurge`)
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (stored) setToken(stored)
  }, [])

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }, [token])

  const isLocalhost = useMemo(() => {
    try {
      const host = new URL(origin || 'http://localhost').hostname
      return host === 'localhost' || host === '127.0.0.1'
    } catch {
      return false
    }
  }, [origin])

  const stats = useMemo(() => {
    const hosts = new Set<string>()
    let s2 = 0
    let s3 = 0
    let s4 = 0
    let s5 = 0
    let latest = 0

    for (const item of items) {
      if (item.host) hosts.add(item.host)
      const t = item.responseCapturedAtMs ?? item.requestCapturedAtMs ?? 0
      if (t > latest) latest = t
      const st = item.responseStatus
      if (st == null) continue
      if (st >= 200 && st < 300) s2++
      else if (st >= 300 && st < 400) s3++
      else if (st >= 400 && st < 500) s4++
      else if (st >= 500) s5++
    }

    return { total: items.length, s2, s3, s4, s5, hosts: hosts.size, latest }
  }, [items])

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

      const headers: HeadersInit = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`/api/nssurge?${params}`, { headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as ExchangesResponse
      setItems(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [hostFilter, limit, q, statusFilter, token])

  const fetchExchangeDetail = useCallback(
    async (surgeRequestId: string) => {
      setLoadingDetailId(surgeRequestId)
      try {
        const params = new URLSearchParams({
          view: 'exchanges',
          withBody: 'true',
          surgeRequestId,
        })
        const headers: HeadersInit = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const res = await fetch(`/api/nssurge?${params}`, { headers })
        if (!res.ok) return
        const data = (await res.json()) as ExchangesResponse
        const match = data.items.find((i) => i.surgeRequestId === surgeRequestId)
        if (match) {
          setDetailById((prev) => ({ ...prev, [surgeRequestId]: match }))
        }
      } finally {
        setLoadingDetailId(null)
      }
    },
    [token],
  )

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

  const handleToggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!detailById[id]) void fetchExchangeDetail(id)
  }

  const handleGenerateModule = () => {
    const domains = parseDomains(domainsInput)
    const text = generateSurgeModule({
      domainsInput,
      domains,
      includeSubdomains,
      collectorEndpoint,
      token,
      scriptBaseUrl,
      maxSize,
      timeoutSeconds,
      enableMitm,
      protocol,
    })
    setModuleText(text)
  }

  const handleCopyModule = async () => {
    if (!moduleText) return
    await navigator.clipboard.writeText(moduleText)
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">NSSurge Collector</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture Surge HTTP request/response text bodies into Prisma via{' '}
          <code className="text-xs">/api/nssurge</code>.
        </p>
      </div>

      {isLocalhost && (
        <div className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          iPhone Surge cannot reach <strong>127.0.0.1</strong> on your Mac. Use your Mac&apos;s LAN
          IP in collector endpoint and script URLs (e.g.{' '}
          <code className="text-xs">http://192.168.1.23:3000/api/nssurge</code>).
        </div>
      )}

      <div className="grid gap-2 rounded border bg-muted/30 p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <span className="text-muted-foreground">Shown</span>
          <p className="font-mono text-sm">{stats.total}</p>
        </div>
        <div>
          <span className="text-muted-foreground">2xx / 3xx / 4xx / 5xx</span>
          <p className="font-mono text-sm">
            {stats.s2} / {stats.s3} / {stats.s4} / {stats.s5}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Unique hosts</span>
          <p className="font-mono text-sm">{stats.hosts}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <span className="text-muted-foreground">Latest captured</span>
          <p className="font-mono text-sm">{stats.latest ? formatTime(stats.latest) : '—'}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pt-0">
          <div className="flex flex-wrap items-end gap-2 px-3 pb-3">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="q">URL search</Label>
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="contains…"
              />
            </div>
            <div>
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                placeholder="api.example.com"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="200"
              />
            </div>
            <div>
              <Label htmlFor="limit">Limit</Label>
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
            <Button type="button" variant="outline" size="sm" onClick={() => void fetchExchanges()}>
              <RefreshCw className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {autoRefresh ? <Pause /> : <Play />}
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
          </div>

          {error && <p className="px-3 text-sm text-destructive">{error}</p>}

          <div className="max-h-[32rem] overflow-auto border-t">
            {items.length === 0 && !loading && (
              <p className="p-4 text-sm text-muted-foreground">
                No exchanges yet. POST events via Surge or curl.
              </p>
            )}
            {items.map((item) => (
              <ExchangeRow
                key={item.surgeRequestId}
                exchange={item}
                expanded={expandedId === item.surgeRequestId}
                onToggle={() => handleToggle(item.surgeRequestId)}
                detail={detailById[item.surgeRequestId] ?? null}
                loadingDetail={loadingDetailId === item.surgeRequestId}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Surge module</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="domains">Domains (comma or newline)</Label>
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
              <Label htmlFor="subdomains">Include subdomains</Label>
            </div>
            <div>
              <Label htmlFor="protocol">Protocol</Label>
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
              <Label htmlFor="endpoint">Collector endpoint</Label>
              <Input
                id="endpoint"
                value={collectorEndpoint}
                onChange={(e) => setCollectorEndpoint(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="scriptBase">Script base URL</Label>
              <Input
                id="scriptBase"
                value={scriptBaseUrl}
                onChange={(e) => setScriptBaseUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="token">Token (localStorage)</Label>
              <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="maxSize">Max body size</Label>
              <Input
                id="maxSize"
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="timeout">Timeout (seconds)</Label>
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
              <Label htmlFor="mitm">Enable MITM hostname</Label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            HTTPS bodies require MITM hostname and a trusted CA on the device. Avoid enabling{' '}
            <code>requires-body=true</code> globally — scope domains narrowly.
          </p>

          <Button type="button" onClick={handleGenerateModule}>
            Generate .sgmodule
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
                  Copy
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadModule}>
                  <Download />
                  Download
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto rounded border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
                {moduleText}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
