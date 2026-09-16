import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { homePathFor } from '../consoles/consoles'
import { AccessProblemPage } from '../pages/AccessProblemPage'
import { SplashScreen } from '../pages/SplashScreen'
import { useAuth } from './AuthContext'
import type { Role } from './roles'

/** Renders children only for an active official with this role; everyone else is redirected. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()

  switch (state.status) {
    case 'loading':
      return <SplashScreen />
    case 'signed-out':
      return <Navigate to="/login" replace state={{ from: location.pathname }} />
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

  switch (state.status) {
    case 'loading':
      return <SplashScreen />
    case 'signed-out':
      return <Navigate to="/login" replace />
    case 'ready':
      return <Navigate to={homePathFor(state.staff.role)} replace />
    default:
      return <AccessProblemPage />
  }
}
