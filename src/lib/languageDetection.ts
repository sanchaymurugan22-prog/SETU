/**
 * Call language detection.
 *
 * SETU never asks an official which language a beneficiary speaks. Every call opens with
 * a bilingual Hindi + English greeting; the caller answers in their own language; the
 * detector identifies it from that first utterance, and the rest of the call continues in
 * the detected language.
 *
 * The detector is an interface with two implementations: a deterministic simulator used
 * for the demo, and a Bhashini-backed one that activates as soon as ULCA credentials are
 * present. Nothing above this file knows which is running.
 */

export type DetectionProvider = 'simulated' | 'bhashini'

export interface LanguageDetection {
  /** Bhashini / ISO code where one exists, otherwise the ISO 639-3 code for the dialect. */
  languageCode: string
  /** Display name, e.g. "Kurukh". Dialects outside the ten console languages appear here too. */
  languageName: string
  /** 0–1. Below DETECTION_THRESHOLD the call is flagged and logged as a dialect gap. */
  confidence: number
  provider: DetectionProvider
}

/** What the detector is given: the caller's first utterance after the greeting. */
export interface DetectionSample {
  callId: string
  /** Recorded audio, when the browser or telephony layer captured it. */
  audio?: Blob
  /** Transcript fallback, used by the simulator and when ASR has already run. */
  transcript?: string
}

export interface LanguageDetector {
  readonly provider: DetectionProvider
  detect(sample: DetectionSample): Promise<LanguageDetection>
}

/** Detections below this are treated as a dialect gap rather than a usable result. */
export const DETECTION_THRESHOLD = 0.75

/**
 * The opening SETU speaks to every caller, before it knows who they are.
 * Hindi first, then English, then it listens.
 */
export const BILINGUAL_GREETING: { code: 'hi' | 'en'; text: string }[] = [
  {
    code: 'hi',
    text: 'नमस्ते, मैं सेतु हूँ। मैं आपको प्रशिक्षण और काम खोजने में मदद करती हूँ। आप अपनी भाषा में बोलिए — मैं उसी भाषा में आगे बात करूँगी।',
  },
  {
    code: 'en',
    text: 'Hello, I am SETU. I help you find skill training and work near you. Please speak in your own language — I will continue in it.',
  },
]

/**
 * Demo detector. Returns whatever the seeded call already carries, so the console behaves
 * exactly as it will in production without inventing a result at random.
 */
export function createSimulatedDetector(lookup: (callId: string) => LanguageDetection | undefined): LanguageDetector {
  return {
    provider: 'simulated',
    async detect(sample) {
      const seeded = lookup(sample.callId)
      if (seeded) return { ...seeded, provider: 'simulated' }
      // A call with nothing seeded behaves like an unrecognised dialect.
      return { languageCode: 'und', languageName: 'Unrecognised', confidence: 0.3, provider: 'simulated' }
    },
  }
}

export interface BhashiniConfig {
  userId: string
  apiKey: string
  /** ULCA audio-language-detection pipeline endpoint. */
  endpoint?: string
}

/**
 * Real detector. Not wired to the network yet: it exists so the call flow, the stored
 * fields and the dialect-gap aggregation are already shaped for Bhashini's response.
 * Fill VITE_BHASHINI_USER_ID and VITE_BHASHINI_API_KEY, then implement the fetch below.
 */
export function createBhashiniDetector(config: BhashiniConfig): LanguageDetector {
  return {
    provider: 'bhashini',
    async detect(sample) {
      if (!config.userId || !config.apiKey) {
        throw new Error('Bhashini credentials missing: set VITE_BHASHINI_USER_ID and VITE_BHASHINI_API_KEY.')
      }
      if (!sample.audio) {
        throw new Error('Bhashini language detection needs the caller audio sample.')
      }
      // Drop-in point: POST the audio to the ULCA audio-lang-detection pipeline and map
      // its { langPrediction: [{ langCode, scriptCode, langScore }] } onto LanguageDetection.
      throw new Error('Bhashini language detection is not implemented yet.')
    },
  }
}

export function bhashiniConfigured(): boolean {
  return Boolean(import.meta.env.VITE_BHASHINI_USER_ID && import.meta.env.VITE_BHASHINI_API_KEY)
}

/** True when the detector was not confident enough to rely on the result. */
export function isDialectGap(detection: LanguageDetection): boolean {
  return detection.confidence < DETECTION_THRESHOLD
}
