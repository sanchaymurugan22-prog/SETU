import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getCallLanguage, storeCallLanguage } from '../lib/callLanguage'
import { languageFor } from '../lib/languages'
import { clearLanguageChoiceFlag, hasChosenLanguage, markLanguageChosen, storeUiLanguage } from '../lib/uiLanguage'
import { LanguageContext } from './LanguageContext'

/**
 * Holds the two language settings. The interface language lives in i18next itself —
 * changing it re-renders every translated component with no reload — while this provider
 * keeps it persisted and exposes the call language and the first-run prompt.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [callCode, setCallCode] = useState(() => getCallLanguage().code)
  const [promptNeeded, setPromptNeeded] = useState(() => !hasChosenLanguage())

  const applyUiLanguage = (code: string) => {
    const language = languageFor(code)
    void i18n.changeLanguage(language.code)
    storeUiLanguage(language.code)
  }

  const value = useMemo(
    () => ({
      uiLanguage: languageFor(i18n.resolvedLanguage ?? i18n.language),
      setUiLanguage: applyUiLanguage,
      callLanguage: languageFor(callCode),
      setCallLanguage: (code: string) => {
        setCallCode(code)
        storeCallLanguage(code)
      },
      promptNeeded,
      confirmLanguage: (code: string) => {
        applyUiLanguage(code)
        markLanguageChosen()
        setPromptNeeded(false)
      },
      requestPrompt: () => {
        clearLanguageChoiceFlag()
        setPromptNeeded(true)
      },
    }),
    // i18n.resolvedLanguage changes on every switch, which is what re-renders consumers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callCode, promptNeeded, i18n.resolvedLanguage, i18n.language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
