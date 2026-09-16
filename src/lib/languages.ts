/**
 * The ten languages SETU supports, shared by the two independent settings:
 *  - interface language (this console's UI, via i18next)  — src/lib/uiLanguage.ts
 *  - call language (what SETU speaks to beneficiaries)     — src/lib/callLanguage.ts
 */

export interface Language {
  /** Bhashini / ISO 639-1 code, also the i18next locale code. */
  code: string
  nativeName: string
  englishName: string
  /** Font stack for the native script. */
  fontFamily: string
}

const DEVANAGARI = "'Noto Serif Devanagari', 'Source Serif 4', serif"

export const LANGUAGES: Language[] = [
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', fontFamily: DEVANAGARI },
  { code: 'en', nativeName: 'English', englishName: 'English', fontFamily: "'Source Serif 4', Georgia, serif" },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', fontFamily: "'Noto Serif Tamil', 'Source Serif 4', serif" },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', fontFamily: "'Noto Serif Telugu', 'Source Serif 4', serif" },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', fontFamily: "'Noto Serif Bengali', 'Source Serif 4', serif" },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', fontFamily: DEVANAGARI },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', fontFamily: "'Noto Serif Gujarati', 'Source Serif 4', serif" },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', fontFamily: "'Noto Serif Kannada', 'Source Serif 4', serif" },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', fontFamily: "'Noto Serif Malayalam', 'Source Serif 4', serif" },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', fontFamily: "'Noto Serif Oriya', 'Source Serif 4', serif" },
]

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)

export const DEFAULT_LANGUAGE = LANGUAGES[0]!

export function languageFor(code: string | null | undefined): Language {
  return LANGUAGES.find((language) => language.code === code) ?? DEFAULT_LANGUAGE
}

// Storage can throw (private windows, blocked site data), and the app must still work.
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* the choice simply will not persist */
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to do */
  }
}
