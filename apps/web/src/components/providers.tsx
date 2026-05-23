'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nProvider } from '@/components/i18n-provider'
import { queryClient } from '@/utils/trpc'
import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools />
        </QueryClientProvider>
        <Toaster richColors />
      </ThemeProvider>
    </I18nProvider>
  )
}
