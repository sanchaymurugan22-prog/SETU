import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_UI_LANGUAGE, languageFor } from '../lib/languages'
import { LanguageContext } from './LanguageContext'

/**
 * Holds the interface language. It lives in i18next itself, so changing it re-renders
 * every translated component with no reload.
 *
 * Nothing is persisted. The app always opens in English, and the selection screen is
 * offered again to whoever is next at the machine — which is why the prompt starts
 * needed on every load and is re-armed on sign-out. The language SETU speaks to a caller
 * is never chosen here: it is detected per call (see lib/languageDetection.ts).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  // Always true on a fresh load: the screen itself is skipped when someone is signed in.
  const [promptNeeded, setPromptNeeded] = useState(true)

  const applyUiLanguage = (code: string) => {
    void i18n.changeLanguage(languageFor(code).code)
  }

  const value = useMemo(
    () => ({
      uiLanguage: languageFor(i18n.resolvedLanguage ?? i18n.language),
      setUiLanguage: applyUiLanguage,
      promptNeeded,
      confirmLanguage: (code: string) => {
        applyUiLanguage(code)
        setPromptNeeded(false)
      },
      requestPrompt: () => {
        // Sign-out hands the machine back: English again, and the screen shown again.
        applyUiLanguage(DEFAULT_UI_LANGUAGE.code)
        setPromptNeeded(true)
      },
    }),
    // i18n.resolvedLanguage changes on every switch, which is what re-renders consumers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [promptNeeded, i18n.resolvedLanguage, i18n.language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
