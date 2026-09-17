import { createContext, useContext } from 'react'

export interface SplashValue {
  /** Show the splash again — used on sign-out, so the next person starts from the top. */
  replay: () => void
}

export const SplashContext = createContext<SplashValue | null>(null)

export function useSplash(): SplashValue {
  const value = useContext(SplashContext)
  if (!value) throw new Error('useSplash must be used inside <SplashGate>')
  return value
}
