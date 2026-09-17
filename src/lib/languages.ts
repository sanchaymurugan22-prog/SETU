/**
 * The ten languages an official can read the console in (i18next), stored by
 * src/lib/uiLanguage.ts. What SETU speaks to a beneficiary is not in this list and is not
 * a setting at all: it is detected from the caller's own speech, and may be a dialect
 * outside these ten. See src/lib/languageDetection.ts.
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

/** The app always opens in English, whatever was chosen last time. */
export const DEFAULT_UI_LANGUAGE = languageFor('en')
