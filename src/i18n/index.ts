import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_CODES } from '../lib/languages'
import bn from './locales/bn.json'
import en from './locales/en.json'
import gu from './locales/gu.json'
import hi from './locales/hi.json'
import kn from './locales/kn.json'
import ml from './locales/ml.json'
import mr from './locales/mr.json'
import or_ from './locales/or.json'
import ta from './locales/ta.json'
import te from './locales/te.json'

/**
 * Interface translations. One flat namespace ("translation"), one JSON file per language,
 * English as the source of truth and the fallback for any key a locale is missing.
 *
 * Adding a screen? Add its keys to en.json first, then every other locale, then run
 * `npm run i18n:check` — it fails on any key that is missing or left in English.
 *
 * The app always starts in English. A language chosen on the selection screen or in the
 * sidebar lasts for that session only: nothing is persisted, so the next person at a
 * shared machine gets English and picks for themselves.
 */
export const resources = {
  hi: { translation: hi },
  en: { translation: en },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
  mr: { translation: mr },
  gu: { translation: gu },
  kn: { translation: kn },
  ml: { translation: ml },
  or: { translation: or_ },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: LANGUAGE_CODES,
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
