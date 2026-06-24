'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { highlightJson, type ShikiTheme } from '@/lib/shiki/highlighter'
import { cn } from '@/lib/utils'

type ShikiCodeBlockProps = {
  code: string
  className?: string
}

function resolveShikiTheme(resolvedTheme: string | undefined): ShikiTheme {
  return resolvedTheme === 'dark' ? 'min-dark' : 'min-light'
}

export function ShikiCodeBlock({ code, className }: ShikiCodeBlockProps) {
  const { resolvedTheme } = useTheme()
  const theme = resolveShikiTheme(resolvedTheme)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    void highlightJson(code, theme).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => {
      cancelled = true
    }
  }, [code, theme])

  if (!html) {
    return (
      <pre
        className={cn(
          'overflow-auto rounded border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap break-all',
          className,
        )}
      >
        {code}
      </pre>
    )
  }

  return (
    <div
      className={cn(
        'shiki-code-block overflow-auto rounded border [&_.shiki]:m-0 [&_.shiki]:overflow-x-auto [&_.shiki]:p-2 [&_.shiki]:text-xs [&_.shiki_code]:whitespace-pre-wrap [&_.shiki_code]:break-all',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
