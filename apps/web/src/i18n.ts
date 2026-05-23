import i18n from 'i18next';
import { getDefaultStore } from 'jotai';
import { initReactI18next } from 'react-i18next';

import { languageAtom, supportedLanguages } from '@/i18n/language';
import enUS from '@/locales/en-US.json';
import zhCN from '@/locales/zh-CN.json';

const store = getDefaultStore();
const initialLanguage = store.get(languageAtom);

i18n.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
    'zh-CN': { translation: zhCN },
  },
  lng: initialLanguage,
  fallbackLng: 'en-US',
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
});

store.sub(languageAtom, () => {
  const language = store.get(languageAtom);

  if (i18n.resolvedLanguage !== language) {
    void i18n.changeLanguage(language);
  }
});

export default i18n;
