/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  /** "true" routes Auth and Firestore to the local emulators (npm run dev:emulator). */
  readonly VITE_USE_EMULATORS?: string
  readonly VITE_BHASHINI_APP_ID?: string
  readonly VITE_BHASHINI_UDYAT_KEY?: string
  readonly VITE_BHASHINI_INFERENCE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
