/**
 * Call language detection.
 *
 * SETU never asks an official which language a beneficiary speaks. Every call opens with
 * a bilingual Hindi + English greeting; the caller answers in their own language; the
 * detector identifies it from that first utterance, and the rest of the call continues in
 * the detected language.
 *
 * Two detectors, not one. Bhashini publishes two audio-language-detection services with
 * identical documented coverage, but they are different models with different label sets:
 *
 *   - bhashini/iitmandi/audio-lang-detection/gpu is stable and confident, but its labels
 *     stop at the twelve scheduled languages. Anything outside that set is silently
 *     mapped onto the nearest one it knows.
 *   - bhashini/ald returns labels beyond those twelve (Santali and Maithili both came
 *     back in testing), but is less steady on short clips.
 *
 * So agreement between them, not a confidence score, is the signal we trust. When both
 * models return the same language, the caller speaks something the stack handles well.
 * When they disagree, the caller speaks something it does not — that contest is what the
 * Opportunity Gap Map counts as a dialect gap.
 *
 * Why not confidence: measured against the live API, an unsupported language comes back
 * WRONG AND CONFIDENT. Magahi speech was labelled Hindi at 0.92 by one model and Maithili
 * at 0.98 by the other; Santali speech was labelled Kannada at 0.87 and Santali at 0.91.
 * A confidence threshold would have passed all four. langScore is still recorded per call
 * — it is useful evidence — but it decides nothing.
 *
 * TESTING CAVEAT: every measurement behind this design was taken on audio synthesised by
 * Bhashini's own TTS, not on real speech over a phone line. Synthesis artefacts are known
 * to matter — the same English sentence scored 0.49/Telugu from one TTS voice and
 * 0.995/English from another. Before this goes anywhere near production, the agreement
 * rates need re-measuring on genuine recordings from the blocks SETU serves.
 */

export type DetectionProvider = 'simulated' | 'bhashini'

/** Bhashini's two detection services. Both are called for every utterance. */
export const PRIMARY_SERVICE_ID = 'bhashini/iitmandi/audio-lang-detection/gpu'
export const SECONDARY_SERVICE_ID = 'bhashini/ald'

export const DETECTION_ENDPOINT = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline'

/** One model's answer, kept verbatim so the record shows what was actually returned. */
export interface ModelPrediction {
  serviceId: string
  /** ISO code as the model returned it. Only codes Bhashini can emit ever appear here. */
  langCode: string
  /** ISO 15924 script, e.g. "deva", "olck". Null when the model omits it. */
  scriptCode: string | null
  /** 0–1. Recorded as evidence; it is not what decides a dialect gap. */
  langScore: number
}

/**
 * agreed — both models returned the same language; the stack handles this caller.
 * contested — they disagreed; the caller speaks something outside the supported set.
 * unconfirmed — only one model answered, so there is nothing to compare.
 */
export type Agreement = 'agreed' | 'contested' | 'unconfirmed'

export interface LanguageDetection {
  /** What the console displays: the primary model's answer. */
  languageCode: string
  languageName: string
  /** The primary model's langScore. Shown as evidence, never used as a threshold. */
  confidence: number
  agreement: Agreement
  primary: ModelPrediction
  secondary: ModelPrediction | null
  provider: DetectionProvider
}

/** What the detector is given: the caller's first utterance after the greeting. */
export interface DetectionSample {
  callId: string
  /** Recorded audio. Required by the real detector; the simulator ignores it. */
  audio?: Blob
  /** Transcript, when ASR has already run. Not used for audio detection. */
  transcript?: string
}

export interface LanguageDetector {
  readonly provider: DetectionProvider
  detect(sample: DetectionSample): Promise<LanguageDetection>
}

/**
 * Every language code Bhashini's detectors can return, with the name SETU shows for it.
 * Codes outside this map are displayed as-is rather than invented into a language.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  as: 'Assamese',
  bn: 'Bengali',
  brx: 'Bodo',
  doi: 'Dogri',
  en: 'English',
  gu: 'Gujarati',
  hi: 'Hindi',
  kn: 'Kannada',
  kok: 'Konkani',
  ks: 'Kashmiri',
  mai: 'Maithili',
  ml: 'Malayalam',
  mni: 'Manipuri',
  mr: 'Marathi',
  ne: 'Nepali',
  or: 'Odia',
  pa: 'Punjabi',
  sa: 'Sanskrit',
  sat: 'Santali',
  sd: 'Sindhi',
  ta: 'Tamil',
  te: 'Telugu',
  ur: 'Urdu',
  und: 'Unrecognised',
}

export function languageNameFor(code: string): string {
  return LANGUAGE_NAMES[code] ?? code
}

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

/** Builds the detection record from whatever the two models returned. */
export function combine(
  primary: ModelPrediction | null,
  secondary: ModelPrediction | null,
  provider: DetectionProvider,
): LanguageDetection {
  // The primary model is the one we display, because it is the steadier of the two.
  const lead = primary ?? secondary
  if (!lead) {
    return {
      languageCode: 'und',
      languageName: languageNameFor('und'),
      confidence: 0,
      agreement: 'unconfirmed',
      primary: { serviceId: PRIMARY_SERVICE_ID, langCode: 'und', scriptCode: null, langScore: 0 },
      secondary: null,
      provider,
    }
  }

  const agreement: Agreement =
    primary && secondary ? (primary.langCode === secondary.langCode ? 'agreed' : 'contested') : 'unconfirmed'

  return {
    languageCode: lead.langCode,
    languageName: languageNameFor(lead.langCode),
    confidence: lead.langScore,
    agreement,
    primary: primary ?? lead,
    secondary: primary ? secondary : null,
    provider,
  }
}

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
      return combine(null, null, 'simulated')
    },
  }
}

export interface BhashiniConfig {
  /** Authorization header for the Dhruva inference endpoint. The only key detection needs. */
  inferenceKey: string
  /** Only needed for getModelsPipeline, which detection does not use. */
  appId?: string
  udyatKey?: string
  endpoint?: string
  primaryServiceId?: string
  secondaryServiceId?: string
}

interface LangPrediction {
  langCode?: string
  scriptCode?: string | null
  langScore?: number | null
}

/** Pulls the first prediction out of a compute response, or null if the shape is unexpected. */
function readPrediction(body: unknown, serviceId: string): ModelPrediction | null {
  const response = (body as { pipelineResponse?: { output?: { langPrediction?: LangPrediction[] }[] }[] })
    ?.pipelineResponse?.[0]
  const prediction = response?.output?.[0]?.langPrediction?.[0]
  if (!prediction?.langCode) return null
  return {
    serviceId,
    langCode: prediction.langCode,
    scriptCode: prediction.scriptCode ?? null,
    // The docs show langScore as null; the live API returns a float. Tolerate both.
    langScore: typeof prediction.langScore === 'number' ? prediction.langScore : 0,
  }
}

async function toBase64(audio: Blob): Promise<string> {
  const bytes = new Uint8Array(await audio.arrayBuffer())
  // Chunked, because a call recording is far past the argument limit of String.fromCharCode.
  let binary = ''
  const CHUNK = 0x8000
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}

/**
 * Real detector. One audio-lang-detection compute call per model, both in parallel.
 *
 * No pipeline config call is involved: audio-lang-detection is a direct compute call
 * authorised by the inference key alone (verified against the live API). If one model
 * fails the other still answers, and the result is marked unconfirmed rather than lost.
 */
export function createBhashiniDetector(config: BhashiniConfig): LanguageDetector {
  const endpoint = config.endpoint ?? DETECTION_ENDPOINT
  const primaryServiceId = config.primaryServiceId ?? PRIMARY_SERVICE_ID
  const secondaryServiceId = config.secondaryServiceId ?? SECONDARY_SERVICE_ID

  async function askModel(serviceId: string, audioContent: string): Promise<ModelPrediction | null> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        Authorization: config.inferenceKey,
      },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: 'audio-lang-detection', config: { serviceId } }],
        inputData: { audio: [{ audioContent }] },
      }),
    })
    if (!response.ok) return null
    return readPrediction(await response.json(), serviceId)
  }

  return {
    provider: 'bhashini',
    async detect(sample) {
      if (!config.inferenceKey) {
        throw new Error('Bhashini credentials missing: set VITE_BHASHINI_INFERENCE_KEY.')
      }
      if (!sample.audio) {
        throw new Error('Bhashini language detection needs the caller audio sample.')
      }

      const audioContent = await toBase64(sample.audio)
      const [primary, secondary] = await Promise.all([
        askModel(primaryServiceId, audioContent).catch(() => null),
        askModel(secondaryServiceId, audioContent).catch(() => null),
      ])

      if (!primary && !secondary) {
        throw new Error('Bhashini language detection failed: neither model returned a prediction.')
      }
      return combine(primary, secondary, 'bhashini')
    },
  }
}

/**
 * The detector the consoles actually use.
 *
 * When Bhashini credentials are present AND the call carried an audio sample, this is the
 * live two-model detector. Otherwise — no credentials, no telephony audio yet, or the API
 * failed mid-call — it falls back to the seeded record so the console keeps working. A
 * call is never left without a detection, and `provider` on the result always says which
 * path produced it.
 */
export function createCallDetector(
  lookup: (callId: string) => LanguageDetection | undefined,
  config: BhashiniConfig,
): LanguageDetector {
  const simulated = createSimulatedDetector(lookup)
  if (!config.inferenceKey) return simulated

  const live = createBhashiniDetector(config)
  return {
    provider: 'bhashini',
    async detect(sample) {
      if (!sample.audio) return simulated.detect(sample)
      try {
        return await live.detect(sample)
      } catch {
        // A failed detection must not take the call down with it.
        return simulated.detect(sample)
      }
    },
  }
}

/**
 * A dialect gap is a contested call: the two models named different languages, which in
 * testing meant the caller spoke something outside Bhashini's supported set.
 */
export function isDialectGap(detection: LanguageDetection): boolean {
  return detection.agreement === 'contested'
}
