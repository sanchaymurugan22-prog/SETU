/**
 * Detection records — one per call SETU has answered.
 *
 * Each record holds what BOTH Bhashini detection models returned and whether they agreed.
 * Agreement is the signal: when the two models name the same language, the stack handles
 * that caller; when they name different ones, the caller speaks something outside the
 * supported set. Those contested calls are the dialect gaps on the Opportunity Gap Map.
 *
 * The seeds below reproduce what the live API actually does. Codes that Bhashini cannot
 * emit — kru for Kurukh, hoc for Ho, nag for Nagpuri — no longer appear anywhere, because
 * no real response would ever contain them. What a Kurukh speaker gets instead is two
 * models confidently naming two different languages, neither of them Kurukh.
 *
 * MEASURED against the live API (synthesised audio, September 2026):
 *   Hindi    → iitmandi hi/deva 1.00  · ald hi/deva  0.93  agreed
 *   Bengali  → iitmandi bn/beng 1.00  · ald bn/beng  1.00  agreed
 *   English  → iitmandi en/latn 1.00  · ald en/latn  0.99  agreed
 *   Magahi   → iitmandi hi/deva 0.92  · ald mai/deva 0.98  contested
 *   Santali  → iitmandi kn/knda 0.87  · ald sat/olck 0.91  contested
 *
 * EXTRAPOLATED, not measured: Kurukh, Ho, Nagpuri and Kharia. No Bhashini service covers
 * them at all, so both models must map them onto something else; they are seeded as
 * contested by analogy with Magahi and Santali. Treat those rows as informed guesses.
 *
 * All measurements were taken on audio synthesised by Bhashini's own TTS, never on real
 * speech over a phone line — see the note at the top of lib/languageDetection.ts. Real
 * recordings from the served blocks are needed before any of this is quoted as fact.
 *
 * In production this is an aggregation over the `calls` collection's detection fields.
 */

import {
  combine,
  languageNameFor,
  PRIMARY_SERVICE_ID,
  SECONDARY_SERVICE_ID,
  type LanguageDetection,
  type ModelPrediction,
} from '../lib/languageDetection'

interface ModelProfile {
  langCode: string
  scriptCode: string | null
  /** Centre of the score the model returns for this input; seeds vary around it. */
  score: number
}

interface SpokenProfile {
  primary: ModelProfile
  secondary: ModelProfile
  /** False for the four languages nobody has measured yet. */
  measured: boolean
}

/**
 * What each model returns for a given spoken language. The key is ground truth about the
 * caller — something the console never sees in production, and only the seed data knows.
 */
const SPOKEN_PROFILES: Record<string, SpokenProfile> = {
  Hindi: {
    primary: { langCode: 'hi', scriptCode: 'deva', score: 0.99 },
    secondary: { langCode: 'hi', scriptCode: 'deva', score: 0.93 },
    measured: true,
  },
  Bengali: {
    primary: { langCode: 'bn', scriptCode: 'beng', score: 1 },
    secondary: { langCode: 'bn', scriptCode: 'beng', score: 0.99 },
    measured: true,
  },
  English: {
    primary: { langCode: 'en', scriptCode: 'latn', score: 0.99 },
    secondary: { langCode: 'en', scriptCode: 'latn', score: 0.99 },
    measured: true,
  },
  Odia: {
    primary: { langCode: 'or', scriptCode: 'orya', score: 0.96 },
    secondary: { langCode: 'or', scriptCode: 'orya', score: 0.94 },
    measured: false,
  },
  Magahi: {
    primary: { langCode: 'hi', scriptCode: 'deva', score: 0.92 },
    secondary: { langCode: 'mai', scriptCode: 'deva', score: 0.98 },
    measured: true,
  },
  Santali: {
    primary: { langCode: 'kn', scriptCode: 'knda', score: 0.87 },
    secondary: { langCode: 'sat', scriptCode: 'olck', score: 0.91 },
    measured: true,
  },
  Kurukh: {
    primary: { langCode: 'hi', scriptCode: 'deva', score: 0.84 },
    secondary: { langCode: 'mai', scriptCode: 'deva', score: 0.88 },
    measured: false,
  },
  Ho: {
    primary: { langCode: 'or', scriptCode: 'orya', score: 0.81 },
    secondary: { langCode: 'sat', scriptCode: 'olck', score: 0.86 },
    measured: false,
  },
  Nagpuri: {
    primary: { langCode: 'hi', scriptCode: 'deva', score: 0.88 },
    secondary: { langCode: 'mai', scriptCode: 'deva', score: 0.9 },
    measured: false,
  },
  Kharia: {
    primary: { langCode: 'or', scriptCode: 'orya', score: 0.79 },
    secondary: { langCode: 'sat', scriptCode: 'olck', score: 0.83 },
    measured: false,
  },
}

const FALLBACK: SpokenProfile = {
  primary: { langCode: 'hi', scriptCode: 'deva', score: 0.8 },
  secondary: { langCode: 'mai', scriptCode: 'deva', score: 0.85 },
  measured: false,
}

/** Small deterministic wobble, so seeded calls do not all carry identical scores. */
function jitter(seed: number): number {
  return ((Math.sin(seed * 12.9898) * 43758.5453) % 1) * 0.06
}

function prediction(profile: ModelProfile, serviceId: string, seed: number): ModelPrediction {
  const score = Math.min(1, Math.max(0.3, profile.score - Math.abs(jitter(seed))))
  return {
    serviceId,
    langCode: profile.langCode,
    scriptCode: profile.scriptCode,
    langScore: Number(score.toFixed(4)),
  }
}

/**
 * The detection two Bhashini models would return for a caller speaking `spokenLanguage`.
 * `variant` only varies the scores, so a given seeded call always looks the same.
 */
export function detected(spokenLanguage: string, variant = 0): LanguageDetection {
  const profile = SPOKEN_PROFILES[spokenLanguage] ?? FALLBACK
  const seed = variant + spokenLanguage.length
  return combine(
    prediction(profile.primary, PRIMARY_SERVICE_ID, seed),
    prediction(profile.secondary, SECONDARY_SERVICE_ID, seed + 7),
    'simulated',
  )
}

/** True when this language has actually been put through the live API. */
export function isMeasured(spokenLanguage: string): boolean {
  return SPOKEN_PROFILES[spokenLanguage]?.measured ?? false
}

/** Calls SETU has already handled statewide, by the language the caller actually spoke. */
const CORPUS: { spoken: string; calls: number }[] = [
  { spoken: 'Hindi', calls: 1840 },
  { spoken: 'Santali', calls: 212 },
  { spoken: 'Kurukh', calls: 268 },
  { spoken: 'Magahi', calls: 154 },
  { spoken: 'Ho', calls: 131 },
  { spoken: 'Nagpuri', calls: 96 },
  { spoken: 'Kharia', calls: 48 },
  { spoken: 'Bengali', calls: 73 },
  { spoken: 'Odia', calls: 41 },
]

/** The statewide history, expanded into one detection record per call. */
export function corpusDetections(): LanguageDetection[] {
  const records: LanguageDetection[] = []
  CORPUS.forEach((entry, index) => {
    for (let call = 0; call < entry.calls; call += 1) {
      records.push(detected(entry.spoken, index * 1000 + call))
    }
  })
  return records
}

export interface ContestedPair {
  /** What the primary model called it — the language the console displayed. */
  primaryCode: string
  primaryName: string
  /** What the second model called it instead. */
  secondaryCode: string
  secondaryName: string
  calls: number
  /** Percentage of all contested calls that look like this. */
  share: number
}

/** Share of calls, 0–100, where the two models named different languages. */
export function contestedShare(records: LanguageDetection[]): number {
  const comparable = records.filter((record) => record.agreement !== 'unconfirmed')
  if (comparable.length === 0) return 0
  const contested = comparable.filter((record) => record.agreement === 'contested').length
  return Math.round((contested / comparable.length) * 1000) / 10
}

/** How many calls each disagreement looks like, commonest first. */
export function contestedPairs(records: LanguageDetection[]): ContestedPair[] {
  const counts = new Map<string, number>()
  for (const record of records) {
    if (record.agreement !== 'contested' || !record.secondary) continue
    const key = `${record.primary.langCode}|${record.secondary.langCode}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  return [...counts.entries()]
    .map(([key, calls]) => {
      const [primaryCode, secondaryCode] = key.split('|') as [string, string]
      return {
        primaryCode,
        primaryName: languageNameFor(primaryCode),
        secondaryCode,
        secondaryName: languageNameFor(secondaryCode),
        calls,
        share: total === 0 ? 0 : Math.round((calls / total) * 100),
      }
    })
    .sort((a, b) => b.calls - a.calls)
}
