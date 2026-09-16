/**
 * The language SETU speaks to beneficiaries — on calls, and in SMS/WhatsApp reports.
 *
 * This is NOT the interface language (see uiLanguage.ts). The two are deliberately
 * independent: a Hindi-reading official may serve a Santali-speaking block. Stored in
 * localStorage so non-React code — the voice and messaging layers — can read it through
 * getCallLanguageCode() without going through React context.
 */
import { languageFor, readStored, writeStored, type Language } from './languages'

const CALL_LANGUAGE_KEY = 'setu.callLanguage'

export function getCallLanguageCode(): string {
  return languageFor(readStored(CALL_LANGUAGE_KEY)).code
}

export function getCallLanguage(): Language {
  return languageFor(readStored(CALL_LANGUAGE_KEY))
}

export function storeCallLanguage(code: string): void {
  writeStored(CALL_LANGUAGE_KEY, languageFor(code).code)
}
