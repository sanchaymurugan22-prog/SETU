import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { homePathFor } from '../consoles/consoles'
import { useLanguages } from '../language/LanguageContext'
import { AccessProblemPage } from '../pages/AccessProblemPage'
import { SplashScreen } from '../pages/SplashScreen'
import { useAuth } from './AuthContext'
import type { Role } from './roles'

/** Signed-out visitors pick a call language before they reach the sign-in form. */
function signedOutPath(promptNeeded: boolean): string {
  return promptNeeded ? '/language' : '/login'
}

/** Renders children only for an active official with this role; everyone else is redirected. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { state } = useAuth()
  const { promptNeeded } = useLanguages()
  const location = useLocation()

  switch (state.status) {
    case 'loading':
      return <SplashScreen />
    case 'signed-out':
      return <Navigate to={signedOutPath(promptNeeded)} replace state={{ from: location.pathname }} />
    case 'ready':
      // Wrong console for this role: send them to their own rather than showing an error.
      return state.staff.role === role ? children : <Navigate to={homePathFor(state.staff.role)} replace />
    default:
      return <AccessProblemPage />
  }
}

/** "/" — sends each official to their own console. */
export function HomeRedirect() {
  const { state } = useAuth()
  const { promptNeeded } = useLanguages()

  switch (state.status) {
    case 'loading':
      return <SplashScreen />
    case 'signed-out':
      return <Navigate to={signedOutPath(promptNeeded)} replace />
    case 'ready':
      return <Navigate to={homePathFor(state.staff.role)} replace />
    default:
      return <AccessProblemPage />
  }
}
