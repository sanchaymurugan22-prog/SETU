/**
 * Microphone capture and playback for the voice line.
 *
 * Bhashini wants 16 kHz mono WAV. Browsers record Opus in WebM, so the recording is
 * decoded, mixed to mono, resampled and re-encoded here rather than on a server — there
 * is no server on the Spark plan, and this keeps the round trip to one network call.
 */

export type MicState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unavailable'

const TARGET_RATE = 16_000

function writeString(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index))
}

/** Mono 16-bit PCM WAV, the format the ASR models expect. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }
  return buffer
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}

/** Decodes whatever the browser recorded into 16 kHz mono and returns base64 WAV. */
export async function blobToWavBase64(blob: Blob): Promise<string> {
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return toBase64(encodeWav(rendered.getChannelData(0), TARGET_RATE))
  } finally {
    void context.close()
  }
}

export interface Recorder {
  stop: () => Promise<Blob>
  cancel: () => void
}

/**
 * Starts recording. Throws a tagged error when the microphone is refused or missing, so
 * the page can say which of the two happened rather than showing a generic failure.
 */
export async function startRecording(): Promise<Recorder> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('mic-unavailable')
  }

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true } })
  } catch {
    throw new Error('mic-denied')
  }

  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start()

  const release = () => {
    for (const track of stream.getTracks()) track.stop()
  }

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          release()
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
        }
        recorder.stop()
      }),
    cancel: () => {
      try {
        recorder.stop()
      } catch {
        // Already stopped; nothing to undo.
      }
      release()
    },
  }
}

let current: HTMLAudioElement | null = null

/** Plays base64 wav and resolves when it finishes — or immediately if it cannot play. */
export function play(base64: string): Promise<void> {
  stopSpeaking()
  return new Promise((resolve) => {
    const audio = new Audio(`data:audio/wav;base64,${base64}`)
    current = audio
    audio.onended = () => resolve()
    audio.onerror = () => resolve()
    void audio.play().catch(() => resolve())
  })
}

/** Plays a pre-generated file from /voice, resolving false when it is not cached. */
export function playCached(url: string): Promise<boolean> {
  stopSpeaking()
  return new Promise((resolve) => {
    const audio = new Audio(url)
    current = audio
    audio.onended = () => resolve(true)
    audio.onerror = () => resolve(false)
    void audio.play().catch(() => resolve(false))
  })
}

export function stopSpeaking(): void {
  if (!current) return
  current.pause()
  current = null
}
