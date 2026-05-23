import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const LANGUAGE_STORAGE_KEY = 'app.language';

export const supportedLanguages = ['en-US', 'zh-CN'] as const;

export type AppLanguage = (typeof supportedLanguages)[number];

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return value === 'en-US' || value === 'zh-CN';
}

export function normalizeLanguage(value: unknown): AppLanguage {
  if (isSupportedLanguage(value)) return value;

  if (typeof value === 'string' && value.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en-US';
}

export function detectUserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en-US';

  const preferredLanguages = [...(navigator.languages ?? []), navigator.language];

  for (const locale of preferredLanguages) {
    if (typeof locale !== 'string') continue;

    const normalizedLanguage = normalizeLanguage(locale);

    if (normalizedLanguage === 'zh-CN' || locale === 'en-US') {
      return normalizedLanguage;
    }
  }

  return 'en-US';
}

const persistedLanguageAtom = atomWithStorage<string>(
  LANGUAGE_STORAGE_KEY,
  detectUserLanguage(),
  undefined,
  { getOnInit: true },
);

export const languageAtom = atom(
  (get): AppLanguage => normalizeLanguage(get(persistedLanguageAtom)),
  (_get, set, language: AppLanguage) => {
    set(persistedLanguageAtom, language);
  },
);
