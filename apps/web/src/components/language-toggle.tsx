'use client'

import { useAtom } from 'jotai'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isSupportedLanguage, languageAtom, type AppLanguage } from '@/i18n/language'

export function LanguageToggle() {
  const { t } = useTranslation()
  const [language, setLanguage] = useAtom(languageAtom)

  const options: AppLanguage[] = ['en-US', 'zh-CN']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
        <Languages className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">{t('Language')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((value) => (
          <DropdownMenuItem
            key={value}
            onClick={() => {
              if (isSupportedLanguage(value)) {
                setLanguage(value)
              }
            }}
            className={language === value ? 'bg-accent' : undefined}
          >
            {value === 'en-US' ? t('English (US)') : t('Chinese (Simplified)')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
