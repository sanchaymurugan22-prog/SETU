import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { useAuth, type AuthState } from '../auth/AuthContext'
import { SetuMark } from '../components/SetuMark'
import { homePathFor } from '../consoles/consoles'
import { auth } from '../lib/firebase'
import { SplashScreen } from './SplashScreen'

function authErrorMessage(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/invalid-email':
      return 'That is not a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled in Firebase Authentication.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'Could not reach the sign-in service. Check your connection.'
    default:
      return `Sign-in failed (${code || 'unknown error'}).`
  }
}

/**
 * Where to go once signed in. A deep link is honoured only inside the official's own
 * console — after a sign-out, the remembered page belongs to the previous user.
 */
function postSignInPath(state: AuthState, locationState: unknown): string {
  // No usable role: "/" explains a missing or deactivated account.
  if (state.status !== 'ready') return '/'
  const home = homePathFor(state.staff.role)
  const from = (locationState as { from?: string } | null)?.from
  return from && (from === home || from.startsWith(`${home}/`)) ? from : home
}

export function LoginPage() {
  const { state } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sign in · SETU'
  }, [])

  if (state.status === 'loading') return <SplashScreen />
  if (state.status !== 'signed-out') {
    return <Navigate to={postSignInPath(state, location.state)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email.trim(), password)
      // AuthProvider sees the new user and this page redirects.
    } catch (err) {
      setError(authErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setError(null)
    setNotice(null)
    const address = email.trim()
    if (!address) {
      setError('Enter your official email first, then choose “Forgot password?”.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, address)
      setNotice(`If ${address} has a SETU account, a password reset link has been sent to it.`)
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  return (
    <div className="login">
      <aside className="login-panel">
        <div className="login-brand">
          <SetuMark size={44} tone="onDark" />
          <span className="login-wordmark">SETU</span>
        </div>

        <div className="login-pitch">
          <div className="login-pitch-title">The bridge, staffed.</div>
          <p>
            Sign in with your official credentials. SETU reads your role and opens the right console — no menu to
            navigate.
          </p>
          <p className="login-pitch-secondary">
            Every entry you make here reaches someone who cannot read this screen. Skilling by voice, in ten
            languages, for anyone with a phone.
          </p>
        </div>

        <div className="login-ministry">
          <div className="emblem-placeholder" aria-hidden="true">
            MoSJE
            <br />
            emblem
          </div>
          <span>
            Ministry of Social Justice
            <br />
            and Empowerment · Government of India
          </span>
        </div>
      </aside>

      <section className="login-form-area">
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="eyebrow">Official access</span>
            <h1>Sign in</h1>
            <p>For departmental staff only. Beneficiaries do not sign in — they reach SETU by phone.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="email">
                Official email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="field">
              <div className="field-label-row">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <button type="button" className="link-button" onClick={() => void handleForgotPassword()}>
                  Forgot password?
                </button>
              </div>
              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(event) => setKeepSignedIn(event.target.checked)}
              />
              <span>Keep me signed in on this device</span>
            </label>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="alert alert-info" role="status">
                {notice}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !email || !password}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="alert alert-info">You will be routed to your console automatically based on your assigned role.</div>
          </form>
        </div>

        <footer className="login-footer">
          Unauthorised access to this system is an offence under the Information Technology Act, 2000.
        </footer>
      </section>
    </div>
  )
}
