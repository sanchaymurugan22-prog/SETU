/**
 * Live check against Bhashini's real API. Skipped unless VITE_BHASHINI_INFERENCE_KEY is
 * set, so an ordinary `npm test` never reaches the network.
 *
 * Run: npm run test:bhashini
 *
 * It generates a Hindi clip with Bhashini TTS, feeds it to createBhashiniDetector, and
 * checks that both models answered and agreed. The audio is synthesised, not recorded
 * over a phone line — see the caveat at the top of src/lib/languageDetection.ts.
 */
import { describe, expect, it } from 'vitest'
import { createBhashiniDetector, DETECTION_ENDPOINT } from '../src/lib/languageDetection.js'

const INFERENCE_KEY = process.env.VITE_BHASHINI_INFERENCE_KEY ?? ''
const HINDI = 'नमस्ते, मैं सेतु हूँ। मैं आपको प्रशिक्षण और काम खोजने में मदद करती हूँ।'

async function speak(text: string, language: string): Promise<Blob> {
  const response = await fetch(DETECTION_ENDPOINT, {
    method: 'POST',
    headers: { Accept: '*/*', 'Content-Type': 'application/json', Authorization: INFERENCE_KEY },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: 'tts',
          config: { language: { sourceLanguage: language }, serviceId: 'Bhashini/IITM/TTS', gender: 'female' },
        },
      ],
      inputData: { input: [{ source: text }], audio: [{ audioContent: null }] },
    }),
  })
  expect(response.status).toBe(200)
  const body = (await response.json()) as { pipelineResponse: { audio: { audioContent: string }[] }[] }
  const base64 = body.pipelineResponse[0]!.audio[0]!.audioContent
  return new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], { type: 'audio/wav' })
}

describe.skipIf(!INFERENCE_KEY)('Bhashini audio language detection (live)', () => {
  it('asks both models and reports agreement for Hindi speech', async () => {
    const detector = createBhashiniDetector({ inferenceKey: INFERENCE_KEY })
    const detection = await detector.detect({ callId: 'live-test', audio: await speak(HINDI, 'hi') })

    console.log('primary  ', JSON.stringify(detection.primary))
    console.log('secondary', JSON.stringify(detection.secondary))
    console.log('agreement', detection.agreement, '· displayed as', detection.languageName)

    expect(detection.provider).toBe('bhashini')
    expect(detection.primary.langCode).toBe('hi')
    expect(detection.secondary?.langCode).toBe('hi')
    expect(detection.agreement).toBe('agreed')
    // langScore is documented as null but the live API returns a float.
    expect(detection.primary.langScore).toBeGreaterThan(0)
  }, 120_000)

  it('reports a contested detection for speech Bhashini does not support', async () => {
    const detector = createBhashiniDetector({ inferenceKey: INFERENCE_KEY })
    // Santali, synthesised in Devanagari: one model hears Kannada, the other Santali.
    const audio = await speak('इञ दो सिलाई तालिम एम गेयाञ। ओका रे मेनाक् आ?', 'sat')
    const detection = await detector.detect({ callId: 'live-test-sat', audio })

    console.log('primary  ', JSON.stringify(detection.primary))
    console.log('secondary', JSON.stringify(detection.secondary))
    console.log('agreement', detection.agreement, '· displayed as', detection.languageName)

    expect(detection.primary.langCode).not.toBe(detection.secondary?.langCode)
    expect(detection.agreement).toBe('contested')
  }, 120_000)
})
