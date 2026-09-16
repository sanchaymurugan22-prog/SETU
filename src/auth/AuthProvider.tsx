import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { AuthContext, type AuthState } from './AuthContext'
import { isRole, type StaffUser } from './roles'

function toStaffUser(user: User, data: DocumentData | undefined): StaffUser | null {
  if (!data || !isRole(data.role)) return null
  return {
    userId: user.uid,
    name: typeof data.name === 'string' && data.name ? data.name : (user.email ?? 'Unnamed official'),
    email: typeof data.email === 'string' && data.email ? data.email : (user.email ?? ''),
    role: data.role,
    isActive: data.isActive === true,
    languages: Array.isArray(data.languages)
      ? data.languages.filter((language: unknown): language is string => typeof language === 'string')
      : [],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const unsubscribeProfile = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const stopProfile = () => {
      unsubscribeProfile.current?.()
      unsubscribeProfile.current = undefined
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      stopProfile()
      if (!user) {
        setState({ status: 'signed-out' })
        return
      }

      setState({ status: 'loading' })
      // Live listener, so a role change or deactivation by an admin applies immediately.
      unsubscribeProfile.current = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          const staff = toStaffUser(user, snapshot.data())
          if (!staff) setState({ status: 'no-profile', user })
          else if (!staff.isActive) setState({ status: 'inactive', user, staff })
          else setState({ status: 'ready', user, staff })
        },
        (error) => setState({ status: 'error', user, message: error.message }),
      )
    })

    return () => {
      stopProfile()
      unsubscribeAuth()
    }
  }, [])

  const value = useMemo(
    () => ({
      state,
      signOut: async () => {
        // Detach first so the listener doesn't report permission errors as the token goes away.
        unsubscribeProfile.current?.()
        unsubscribeProfile.current = undefined
        await firebaseSignOut(auth)
      },
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
