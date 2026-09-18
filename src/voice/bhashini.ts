/**
 * The voice layer: Bhashini ASR for hearing and TTS for speaking.
 *
 * Both pick their model from the detected language rather than using one fixed service,
 * because coverage differs sharply between them — the Dravidian ASR model does not know
 * Hindi, and the IIT Madras TTS voice is the only one that covers Santali.
 *
 * Every call here fails soft. A demo that loses its network must keep going with text on
 * screen, so each function returns null rather than throwing, and the caller decides what
 * to show. Timeouts are deliberate and short: waiting 30 seconds in front of a room is
 * worse than dropping to text.
 */

import { DETECTION_ENDPOINT } from '../lib/languageDetection'

/** Speech recognition, per language. Chosen for coverage, not novelty. */
const ASR_SERVICES: Record<string, string> = {
  hi: 'ai4bharat/conformer-hi-gpu--t4',
  en: 'ai4bharat/whisper-medium-en--gpu--t4',
  bn: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  or: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  mr: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  gu: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  pa: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  ta: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  te: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  kn: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  ml: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  as: 'bhashini/ai4bharat/conformer-multilingual-asr',
  sat: 'bhashini/ai4bharat/conformer-multilingual-asr',
  mai: 'bhashini/iisc/asr-mai-t4',
}

/** Speech synthesis, per language. */
const TTS_SERVICES: Record<string, string> = {
  hi: 'Bhashini/IITM/TTS',
  en: 'Bhashini/IITM/TTS',
  bn: 'Bhashini/IITM/TTS',
  or: 'Bhashini/IITM/TTS',
  mr: 'Bhashini/IITM/TTS',
  gu: 'Bhashini/IITM/TTS',
  pa: 'Bhashini/IITM/TTS',
  ta: 'Bhashini/IITM/TTS',
  te: 'Bhashini/IITM/TTS',
  kn: 'Bhashini/IITM/TTS',
  ml: 'Bhashini/IITM/TTS',
  as: 'Bhashini/IITM/TTS',
  sat: 'Bhashini/IITM/TTS',
  mai: 'Bhashini/IISC/TTS',
}

export function asrServiceFor(langCode: string): string {
  return ASR_SERVICES[langCode] ?? ASR_SERVICES.hi!
}

export function ttsServiceFor(langCode: string): string {
  return TTS_SERVICES[langCode] ?? TTS_SERVICES.hi!
}

/**
 * Voice settings for the caller SETU is built for: an older person on a basic phone in a
 * noisy place. A female voice tested clearer on the IITM models, and 0.85 speed gives
 * roughly a fifth more time per word without sounding artificial.
 */
export const VOICE_GENDER = 'female'
export const VOICE_SPEED = 0.85

const TIMEOUT_MS = 12_000

async function post(body: unknown, inferenceKey: string, timeoutMs = TIMEOUT_MS): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(DETECTION_ENDPOINT, {
      method: 'POST',
      headers: { Accept: '*/*', 'Content-Type': 'application/json', Authorization: inferenceKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    // Aborted, offline, or refused — the call goes on in text.
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Speech to text. Returns null when Bhashini could not be reached or heard nothing. */
export async function transcribe(
  audioBase64: string,
  langCode: string,
  inferenceKey: string,
): Promise<string | null> {
  const body = await post(
    {
      pipelineTasks: [
        {
          taskType: 'asr',
          config: {
            language: { sourceLanguage: langCode },
            serviceId: asrServiceFor(langCode),
            audioFormat: 'wav',
            samplingRate: 16000,
          },
        },
      ],
      inputData: { audio: [{ audioContent: audioBase64 }] },
    },
    inferenceKey,
  )
  const text = (body as { pipelineResponse?: { output?: { source?: string }[] }[] })?.pipelineResponse?.[0]?.output?.[0]
    ?.source
  const trimmed = text?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

/** Text to speech. Returns base64 wav, or null so the line is shown instead of spoken. */
export async function synthesise(text: string, langCode: string, inferenceKey: string): Promise<string | null> {
  const body = await post(
    {
      pipelineTasks: [
        {
          taskType: 'tts',
          config: {
            language: { sourceLanguage: langCode },
            serviceId: ttsServiceFor(langCode),
            gender: VOICE_GENDER,
            speed: VOICE_SPEED,
            samplingRate: 16000,
          },
        },
      ],
      inputData: { input: [{ source: text }], audio: [{ audioContent: null }] },
    },
    inferenceKey,
  )
  const audio = (body as { pipelineResponse?: { audio?: { audioContent?: string }[] }[] })?.pipelineResponse?.[0]
    ?.audio?.[0]?.audioContent
  return audio ?? null
}
