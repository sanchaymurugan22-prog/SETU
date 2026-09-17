/**
 * Detection records — one per call SETU has answered.
 *
 * Every record is what the detector returned after the bilingual greeting: which language
 * the caller spoke, and how sure the model was. Averaged per language, these are the
 * dialect-gap figures on the Opportunity Gap Map: the languages SETU hears badly.
 *
 * Seeded deterministically for the demo. In production this is an aggregation over the
 * `calls` collection's detection fields.
 */

import type { LanguageDetection } from '../lib/languageDetection'

export interface DetectionRecord {
  languageCode: string
  languageName: string
  confidence: number
}

export const LANGUAGE_CODES: Record<string, string> = {
  Hindi: 'hi',
  Kurukh: 'kru',
  Santali: 'sat',
  Ho: 'hoc',
  Magahi: 'mag',
  Nagpuri: 'nag',
  Kharia: 'khr',
}

export function detected(languageName: string, confidence: number): LanguageDetection {
  return {
    languageCode: LANGUAGE_CODES[languageName] ?? 'und',
    languageName,
    confidence,
    provider: 'simulated',
  }
}

/** Mean confidence and call volume per language, as observed across the state. */
const CORPUS: { language: string; mean: number; samples: number }[] = [
  { language: 'Hindi', mean: 0.94, samples: 1840 },
  { language: 'Santali', mean: 0.61, samples: 212 },
  { language: 'Kurukh', mean: 0.64, samples: 268 },
  { language: 'Magahi', mean: 0.73, samples: 154 },
  { language: 'Ho', mean: 0.76, samples: 131 },
  { language: 'Kharia', mean: 0.78, samples: 64 },
  { language: 'Nagpuri', mean: 0.79, samples: 96 },
]

export interface DialectAccuracy {
  dialect: string
  languageCode: string
  /** Mean detection confidence as a percentage. */
  accuracy: number
  samples: number
}

/**
 * Detection accuracy per language, newest calls included.
 * `recent` lets the live call records nudge the averages they belong to.
 */
export function dialectAccuracy(recent: DetectionRecord[] = []): DialectAccuracy[] {
  return CORPUS.map((entry) => {
    const extra = recent.filter((record) => record.languageName === entry.language)
    const total = entry.mean * entry.samples + extra.reduce((sum, record) => sum + record.confidence, 0)
    const samples = entry.samples + extra.length
    return {
      dialect: entry.language,
      languageCode: LANGUAGE_CODES[entry.language] ?? 'und',
      accuracy: Math.round((total / samples) * 100),
      samples,
    }
  }).sort((a, b) => a.accuracy - b.accuracy)
}
