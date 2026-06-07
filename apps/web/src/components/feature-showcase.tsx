'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  Check,
  Circle,
  Download,
  ListTodo,
  Radio,
  Sparkles,
  Terminal,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { cloneElement, isValidElement, type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'

const MIRROR_EXAMPLE_PATH =
  '/api/mirror/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-i686-pc-windows-msvc.zip'

type FeatureCardProps = {
  href?: Route
  className?: string
  gradient: string
  glow: string
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
  badge?: string
  children?: ReactNode
  footer?: ReactNode
}

function renderIcon(icon: ReactNode, className: string) {
  if (isValidElement<{ className?: string }>(icon)) {
    return cloneElement(icon, {
      className: cn(icon.props.className, className),
    })
  }

  return icon
}

function FeatureCard({
  href,
  className,
  gradient,
  glow,
  eyebrow,
  title,
  description,
  icon,
  badge,
  children,
  footer,
}: FeatureCardProps) {
  const inner = (
    <article
      className={cn(
        'group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl',
        href && 'cursor-pointer',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100',
          gradient,
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl transition-all duration-500 group-hover:scale-110',
          glow,
        )}
      />
      <div className="pointer-events-none absolute -bottom-8 -left-8 opacity-[0.07] transition-transform duration-500 group-hover:scale-105">
        {renderIcon(icon, 'size-36')}
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-background/70 shadow-sm backdrop-blur-md">
            {renderIcon(icon, 'size-5')}
          </div>
          <div className="flex items-center gap-2">
            {badge ? (
              <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase backdrop-blur-sm">
                {badge}
              </span>
            ) : null}
            {href ? (
              <span className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-all group-hover:border-foreground/20 group-hover:bg-foreground group-hover:text-background">
                <ArrowUpRight className="size-4" />
              </span>
            ) : null}
          </div>
        </div>

        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {children ? <div className="mt-auto pt-5">{children}</div> : null}
        {footer ? <div className="relative z-10 mt-auto pt-5">{footer}</div> : null}
      </div>
    </article>
  )

  const wrapperClassName = cn('block h-full min-w-0', className)

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          wrapperClassName,
          'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {inner}
      </Link>
    )
  }

  return <div className={wrapperClassName}>{inner}</div>
}

export default function FeatureShowcase() {
  const { t } = useTranslation()
  const healthCheck = useQuery(trpc.healthCheck.queryOptions())
  const [origin, setOrigin] = useState('http://localhost:3000')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const isConnected = Boolean(healthCheck.data)
  const isChecking = healthCheck.isLoading

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,oklch(0.92_0.04_250/0.5),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.08_260/0.35),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_0/0.03)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0/0.03)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <header className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
            <Sparkles className="size-3.5 text-chart-2" />
            {t('Batteries included')}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('Ship faster with a modern TypeScript stack')}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t(
              'Production-ready examples for API health, CRUD, artifact mirroring, and Surge traffic — wired with tRPC and Prisma.',
            )}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 sm:items-stretch">
          <FeatureCard
            gradient="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
            glow="bg-emerald-400/20"
            eyebrow={t('Real-time')}
            title={t('API Status')}
            description={t('Live tRPC health check — know your backend is up.')}
            badge="tRPC"
            icon={<Radio className="size-5 text-emerald-600 dark:text-emerald-400" />}
          >
            <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-3">
                    <span
                      className={cn(
                        'absolute inline-flex size-full rounded-full opacity-75',
                        isConnected
                          ? 'animate-ping bg-emerald-400'
                          : isChecking
                            ? 'animate-ping bg-amber-400'
                            : 'bg-red-400',
                      )}
                    />
                    <span
                      className={cn(
                        'relative inline-flex size-3 rounded-full',
                        isConnected ? 'bg-emerald-500' : isChecking ? 'bg-amber-500' : 'bg-red-500',
                      )}
                    />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isChecking
                        ? t('Checking...')
                        : isConnected
                          ? t('Connected')
                          : t('Disconnected')}
                    </p>
                    <p className="text-xs text-muted-foreground">trpc.healthCheck</p>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {isConnected ? '200 OK' : isChecking ? '…' : '—'}
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            href="/todos"
            gradient="bg-gradient-to-br from-violet-500/12 via-transparent to-sky-500/8"
            glow="bg-violet-400/20"
            eyebrow={t('Full-stack')}
            title={t('Todo CRUD')}
            description={t(
              'Create, list, toggle completion, and delete — end-to-end type safety from Prisma to React.',
            )}
            badge="Prisma"
            icon={<ListTodo className="size-5 text-violet-600 dark:text-violet-400" />}
          >
            <div className="space-y-2 rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm backdrop-blur-md">
              {[
                { done: true, text: t('Deploy to production') },
                { done: false, text: t('Wire up tRPC mutations') },
                { done: false, text: t('Ship the next feature') },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 px-3 py-2"
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-md border',
                      item.done
                        ? 'border-violet-500/30 bg-violet-500/15 text-violet-600 dark:text-violet-300'
                        : 'border-border bg-background text-transparent',
                    )}
                  >
                    {item.done ? (
                      <Check className="size-3" />
                    ) : (
                      <Circle className="size-3 opacity-0" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-sm',
                      item.done ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard
            gradient="bg-gradient-to-br from-sky-500/12 via-transparent to-cyan-500/8"
            glow="bg-sky-400/20"
            eyebrow={t('Self-hosted CDN')}
            title={t('GitHub Artifact Mirror')}
            description={t(
              'Cache GitHub release artifacts via /api/mirror. First hit fetches upstream; every request after is instant from disk.',
            )}
            badge="GitHub"
            icon={<Download className="size-5 text-sky-600 dark:text-sky-400" />}
            footer={
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('Some regions may have restricted GitHub access — see')}{' '}
                <a
                  href="https://github.com/gengjiawen/os-init#generate-mihomo-config"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('os-init Mihomo setup')}
                </a>
                {t(' if needed.')}
              </p>
            }
          >
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-zinc-950 shadow-lg">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                <Terminal className="size-3.5 text-zinc-400" />
                <span className="text-[11px] font-medium text-zinc-400">curl</span>
                <div className="ml-auto flex gap-1.5">
                  <span className="size-2 rounded-full bg-zinc-600" />
                  <span className="size-2 rounded-full bg-zinc-600" />
                  <span className="size-2 rounded-full bg-zinc-600" />
                </div>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-emerald-400 sm:text-xs">
                <span className="text-zinc-500">$ </span>
                {`curl -OJ "${origin}${MIRROR_EXAMPLE_PATH}"`}
              </pre>
            </div>
          </FeatureCard>

          <FeatureCard
            href="/nssurge"
            gradient="bg-gradient-to-br from-orange-500/12 via-transparent to-rose-500/8"
            glow="bg-orange-400/20"
            eyebrow={t('Network debug')}
            title={t('NSSurge Collector')}
            description={t(
              'POST Surge request/response text bodies to /api/nssurge. Browse, filter, and export .sgmodule URLs.',
            )}
            badge="Surge"
            icon={<Activity className="size-5 text-orange-600 dark:text-orange-400" />}
          >
            <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                <span>{t('Live capture')}</span>
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-orange-700 dark:text-orange-300">
                  POST /api/nssurge
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { method: 'GET', host: 'api.example.com', status: '200' },
                  { method: 'POST', host: 'collector.local', status: '201' },
                ].map((row) => (
                  <div
                    key={`${row.method}-${row.host}`}
                    className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 font-mono text-[11px] sm:text-xs"
                  >
                    <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-semibold text-orange-700 dark:text-orange-300">
                      {row.method}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{row.host}</span>
                    <span className="text-muted-foreground">{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </div>
  )
}
