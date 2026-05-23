'use client'

import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import '@/i18n'
import { languageAtom } from '@/i18n/language'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useAtomValue(languageAtom)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return children
}
