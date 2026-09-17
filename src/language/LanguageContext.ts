import { createContext, useContext } from 'react'
import type { Language } from '../lib/languages'

export interface LanguageValue {
  /** The console's own display language (i18next). */
  uiLanguage: Language
  setUiLanguage: (code: string) => void
  /** True when the selection screen should be shown before sign-in. */
  promptNeeded: boolean
  /** Choose on the selection screen: applies the language and dismisses the prompt. */
  confirmLanguage: (code: string) => void
  /** Ask again before the next sign-in (called on sign-out). */
  requestPrompt: () => void
}

export const LanguageContext = createContext<LanguageValue | null>(null)

export function useLanguages(): LanguageValue {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguages must be used inside <LanguageProvider>')
  return value
}
