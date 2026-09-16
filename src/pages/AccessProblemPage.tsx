import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { SetuMark } from '../components/SetuMark'

/** Shown to a signed-in account that cannot enter any console. */
export function AccessProblemPage() {
  const { state, signOut } = useAuth()

  useEffect(() => {
    document.title = 'Account access · SETU'
  }, [])

  let title: string
  let body: ReactNode
  switch (state.status) {
    case 'no-profile':
      title = 'No console assigned'
      body = (
        <>
          <p>
            You are signed in as <strong>{state.user.email}</strong>, but this account has no SETU role. An
            administrator needs to create its record in the <code>users</code> collection.
          </p>
          <dl className="notice-details">
            <dt>User UID</dt>
            <dd>
              <code>{state.user.uid}</code>
            </dd>
          </dl>
        </>
      )
      break
    case 'inactive':
      title = 'Account deactivated'
      body = (
        <p>
          The account <strong>{state.staff.email}</strong> has been deactivated by an administrator. Contact your
          administrator to restore access.
        </p>
      )
      break
    case 'error':
      title = 'Could not load your account'
      body = (
        <>
          <p>{state.message}</p>
          <p className="muted">
            If this mentions missing or insufficient permissions, check that the Firestore security rules are
            published and that your <code>users</code> record exists.
          </p>
        </>
      )
      break
    default:
      return null
  }

  return (
    <div className="notice-page">
      <div className="notice-card">
        <div className="notice-bar">
          <SetuMark size={30} tone="onDark" />
          <span className="notice-wordmark">SETU</span>
        </div>
        <div className="notice-content">
          <h1>{title}</h1>
          {body}
          <button type="button" className="btn btn-primary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
