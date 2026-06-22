import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from '../../messages/en.json';
import zhCN from '../../messages/zh-CN.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const LANGUAGE_STORAGE_KEY = 'astrofox.language';

const isBrowser = typeof window !== 'undefined';

if (!i18n.isInitialized) {
  const instance = i18n.use(initReactI18next);

  if (isBrowser) {
    instance.use(LanguageDetector);
  }

  instance.init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN },
    },
    lng: isBrowser ? undefined : DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
    },
  });
}

// Expose for debugging from devtools.
if (isBrowser) {
  (window as unknown as { i18n?: typeof i18n }).i18n = i18n;
}

export default i18n;
