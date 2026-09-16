import { useCallback } from 'react'
import { useLanguages } from '../language/LanguageContext'
import { useAuth } from './AuthContext'

/**
 * Sign out and ask for the language again, so the next person at this machine
 * chooses before signing in.
 */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth()
  const { requestPrompt } = useLanguages()

  return useCallback(async () => {
    requestPrompt()
    await signOut()
  }, [requestPrompt, signOut])
}
