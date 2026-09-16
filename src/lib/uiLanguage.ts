/**
 * The interface language of this console (i18next). Separate from the call language:
 * an official can read the console in English while SETU speaks Santali on calls.
 */
import { DEFAULT_LANGUAGE, languageFor, readStored, removeStored, writeStored } from './languages'

const UI_LANGUAGE_KEY = 'setu.uiLanguage'
const CHOSEN_KEY = 'setu.languageChosen'

export function getUiLanguageCode(): string {
  const stored = readStored(UI_LANGUAGE_KEY)
  return stored ? languageFor(stored).code : DEFAULT_LANGUAGE.code
}

export function storeUiLanguage(code: string): void {
  writeStored(UI_LANGUAGE_KEY, languageFor(code).code)
}

/** True once someone has completed the language selection screen. */
export function hasChosenLanguage(): boolean {
  return readStored(CHOSEN_KEY) === '1' && readStored(UI_LANGUAGE_KEY) !== null
}

export function markLanguageChosen(): void {
  writeStored(CHOSEN_KEY, '1')
}

/** Called on sign-out, so the next person at this machine chooses again. */
export function clearLanguageChoiceFlag(): void {
  removeStored(CHOSEN_KEY)
}
