import type { BhashiniConfig } from './languageDetection'
const REQUIRED_FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

/** Names of required Firebase env vars that are missing or blank. */
export function missingFirebaseEnv(): string[] {
  return REQUIRED_FIREBASE_KEYS.filter((key) => !import.meta.env[key]?.trim())
}

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

/**
 * Bhashini credentials for the language detector. Kept here rather than in
 * languageDetection.ts so that module stays free of `import.meta` and can run under
 * plain Node — which is how the live API test exercises it.
 */
export function bhashiniConfigFromEnv(): BhashiniConfig {
  return {
    inferenceKey: import.meta.env.VITE_BHASHINI_INFERENCE_KEY ?? '',
    appId: import.meta.env.VITE_BHASHINI_APP_ID,
    udyatKey: import.meta.env.VITE_BHASHINI_UDYAT_KEY,
  }
}

/** True once the inference key is present — the only key detection needs. */
export function bhashiniConfigured(): boolean {
  return Boolean(import.meta.env.VITE_BHASHINI_INFERENCE_KEY?.trim())
}
