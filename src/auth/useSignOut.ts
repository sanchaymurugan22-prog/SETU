import { useCallback } from 'react'
import { useLanguages } from '../language/LanguageContext'
import { useSplash } from '../pages/SplashContext'
import { useAuth } from './AuthContext'

/**
 * Sign out and hand the machine back: the splash plays again, the interface returns to
 * English, and the language screen is offered before the next sign-in. The order matters
 * — the splash is raised first, so it covers the console unmounting behind it.
 */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth()
  const { requestPrompt } = useLanguages()
  const { replay } = useSplash()

  return useCallback(async () => {
    replay()
    requestPrompt()
    await signOut()
  }, [replay, requestPrompt, signOut])
}
