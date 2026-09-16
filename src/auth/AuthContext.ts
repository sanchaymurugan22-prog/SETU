import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { StaffUser } from './roles'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  // Signed in to Firebase Auth, but users/{uid} is missing or has no valid role.
  | { status: 'no-profile'; user: User }
  | { status: 'inactive'; user: User; staff: StaffUser }
  | { status: 'ready'; user: User; staff: StaffUser }
  | { status: 'error'; user: User; message: string }

export interface AuthContextValue {
  state: AuthState
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
