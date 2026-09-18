/**
 * Pre-generates the fixed spoken lines as audio, so no turn in the demo waits on a TTS
 * round trip. Only dynamic lines — the recommendation and the close, which carry the
 * caller's own details — are synthesised live.
 *
 * Run: npm run voice:build   (needs VITE_BHASHINI_INFERENCE_KEY in .env)
 *
 * Writes public/voice/<lang>/<lineId>.wav. Languages default to the demo path, hi and
 * en; pass more as arguments once their lines are authored.
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import lines from '../src/voice/lines.json' with { type: 'json' }

const ENDPOINT = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline'
const KEY = process.env.VITE_BHASHINI_INFERENCE_KEY

const TTS_SERVICES = {
  hi: 'Bhashini/IITM/TTS',
  en: 'Bhashini/IITM/TTS',
  bn: 'Bhashini/IITM/TTS',
  or: 'Bhashini/IITM/TTS',
  ta: 'Bhashini/IITM/TTS',
  te: 'Bhashini/IITM/TTS',
  kn: 'Bhashini/IITM/TTS',
  ml: 'Bhashini/IITM/TTS',
  mr: 'Bhashini/IITM/TTS',
  gu: 'Bhashini/IITM/TTS',
}

/** The lines worth caching: everything SETU says the same way on every call. */
const CACHEABLE = [
  'greetingHi', 'greetingEn', 'consent', 'consentRefused', 'consentUnclear', 'name', 'nameRefused',
  'location', 'locationRetry', 'work', 'family', 'education', 'educationNone', 'interest',
  'interestProbe', 'travel', 'connectivity', 'preference', 'preferenceUnsure', 'secondary',
  'handOver', 'cannotUnderstand', 'stillThere', 'courseQuestion', 'noJobs', 'ownWork', 'notHuman',
]

if (!KEY) {
  console.error('VITE_BHASHINI_INFERENCE_KEY is not set. Run with: node --env-file=.env scripts/pregenerate-voice.mjs')
  process.exit(1)
}

const languages = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['hi', 'en']

async function speak(text, language) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Accept: '*/*', 'Content-Type': 'application/json', Authorization: KEY },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: 'tts',
          config: {
            language: { sourceLanguage: language },
            serviceId: TTS_SERVICES[language] ?? TTS_SERVICES.hi,
            // Slower than default and a female voice: this caller is often elderly, on a
            // basic phone, in a noisy place.
            gender: 'female',
            speed: 0.85,
            samplingRate: 16000,
          },
        },
      ],
      inputData: { input: [{ source: text }], audio: [{ audioContent: null }] },
    }),
  })
  if (!response.ok) return null
  const body = await response.json()
  return body?.pipelineResponse?.[0]?.audio?.[0]?.audioContent ?? null
}

/**
 * Bhashini returns 48 kHz regardless of the sampling rate asked for. Speech does not
 * need it, and the demo machine should not load three times the audio it has to, so
 * 16-bit PCM is decimated to 16 kHz mono here — the same rate the ASR side uses.
 */
function downsample(buffer) {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') return buffer
  const channels = buffer.readUInt16LE(22)
  const rate = buffer.readUInt32LE(24)
  const bits = buffer.readUInt16LE(34)
  if (bits !== 16 || rate <= 16000 || rate % 16000 !== 0) return buffer

  const factor = rate / 16000
  const dataOffset = 44
  const samples = (buffer.length - dataOffset) / 2
  const kept = Math.floor(samples / (factor * channels))
  const out = Buffer.alloc(44 + kept * 2)
  buffer.copy(out, 0, 0, 44)

  for (let index = 0; index < kept; index += 1) {
    out.writeInt16LE(buffer.readInt16LE(dataOffset + index * factor * channels * 2), 44 + index * 2)
  }

  out.writeUInt32LE(36 + kept * 2, 4)
  out.writeUInt16LE(1, 22)
  out.writeUInt32LE(16000, 24)
  out.writeUInt32LE(32000, 28)
  out.writeUInt16LE(2, 32)
  out.writeUInt32LE(kept * 2, 40)
  return out
}

let written = 0
let skipped = 0
let failed = 0
let bytes = 0

for (const language of languages) {
  const directory = join('public', 'voice', language)
  mkdirSync(directory, { recursive: true })

  for (const id of CACHEABLE) {
    const line = lines[id]
    if (!line) continue
    // English lines are spoken in English; everything else uses that language's text,
    // falling back to the Hindi wording where no translation is authored yet.
    const text = language === 'en' ? line.en : line.hi
    const target = join(directory, `${id}.wav`)

    if (existsSync(target)) {
      skipped += 1
      bytes += statSync(target).size
      continue
    }

    const audio = await speak(text, language)
    if (!audio) {
      console.warn(`  ✗ ${language}/${id}`)
      failed += 1
      continue
    }
    const buffer = downsample(Buffer.from(audio, 'base64'))
    writeFileSync(target, buffer)
    bytes += buffer.length
    written += 1
    process.stdout.write(`  ✓ ${language}/${id} (${Math.round(buffer.length / 1024)} KB)\n`)
  }
}

console.log(
  `\n${written} generated, ${skipped} already present, ${failed} failed · ${(bytes / 1024 / 1024).toFixed(1)} MB total`,
)
if (failed > 0) console.log('Failed lines fall back to live TTS, and to on-screen text if that fails too.')
