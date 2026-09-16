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
