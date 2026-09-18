import { useCallback, useRef, useState } from 'react'
import type { WriteResult } from './writes'

export interface ActionState {
  /** Set when the last write failed — show it; the optimistic change has been rolled back. */
  error: string | null
  pending: boolean
  run: (action: () => Promise<WriteResult>) => Promise<boolean>
  clear: () => void
}

/**
 * Runs one console action and holds whatever went wrong.
 *
 * The error is deliberately sticky until dismissed or the next attempt: a write that was
 * refused must not disappear from the screen before the official has read it, because the
 * change they made has already been taken back off the screen.
 */
export function useAction(): ActionState {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // A second click while the first write is in flight would file the action twice.
  const busy = useRef(false)

  const run = useCallback(async (action: () => Promise<WriteResult>) => {
    if (busy.current) return false
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const result = await action()
      if (!result.ok) setError(result.error)
      return result.ok
    } finally {
      busy.current = false
      setPending(false)
    }
  }, [])

  return { error, pending, run, clear: () => setError(null) }
}
