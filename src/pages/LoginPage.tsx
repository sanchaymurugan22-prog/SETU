import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, Link } from 'react-router-dom'
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
import { useLanguages } from '../language/LanguageContext'
import { auth } from '../lib/firebase'
import { SplashScreen } from './SplashScreen'

/** Maps a Firebase error to a translation key; the raw code is shown only as a fallback. */
function authErrorKey(error: unknown): { key: string; code: string } {
  const code = error instanceof FirebaseError ? error.code : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { key: 'login.errors.invalidCredential', code }
    case 'auth/invalid-email':
      return { key: 'login.errors.invalidEmail', code }
    case 'auth/user-disabled':
      return { key: 'login.errors.userDisabled', code }
    case 'auth/too-many-requests':
      return { key: 'login.errors.tooManyRequests', code }
    case 'auth/network-request-failed':
      return { key: 'login.errors.network', code }
    default:
      return { key: 'login.errors.unknown', code: code || 'unknown error' }
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
  const { t } = useTranslation()
  const { state } = useAuth()
  const { promptNeeded } = useLanguages()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${t('login.title')} · SETU`
  }, [t])

  if (state.status === 'loading') return <SplashScreen />
  // Nobody signed in and no language chosen yet: that screen comes first.
  if (state.status === 'signed-out' && promptNeeded) {
    return <Navigate to="/language" replace state={location.state} />
  }
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
      const { key, code } = authErrorKey(err)
      setError(t(key, { code }))
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setError(null)
    setNotice(null)
    const address = email.trim()
    if (!address) {
      setError(t('login.resetNeedsEmail'))
      return
    }
    try {
      await sendPasswordResetEmail(auth, address)
      setNotice(t('login.resetSent', { email: address }))
    } catch (err) {
      const { key, code } = authErrorKey(err)
      setError(t(key, { code }))
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
          <div className="login-pitch-title">{t('login.panelTitle')}</div>
          <p>{t('login.panelBody')}</p>
          <p className="login-pitch-secondary">{t('login.panelBodySecondary')}</p>
        </div>

        <Link className="login-demo-link voice-demo-link" to="/call">
          {t('voice.title')} →
        </Link>

        <div className="login-ministry">
          <div className="emblem-placeholder" aria-hidden="true">
            {t('common.emblemPlaceholder')}
          </div>
          <span>
            {t('common.ministryLine1')}
            <br />
            {t('common.ministryLine2')} · {t('common.government')}
          </span>
        </div>
      </aside>

      <section className="login-form-area">
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="eyebrow">{t('login.eyebrow')}</span>
            <h1>{t('login.title')}</h1>
            <p>{t('login.subtitle')}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="email">
                {t('login.emailLabel')}
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
                  {t('login.passwordLabel')}
                </label>
                <button type="button" className="link-button" onClick={() => void handleForgotPassword()}>
                  {t('login.forgotPassword')}
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
                  {showPassword ? t('login.hide') : t('login.show')}
                </button>
              </div>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(event) => setKeepSignedIn(event.target.checked)}
              />
              <span>{t('login.keepSignedIn')}</span>
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
              {submitting ? t('login.submitting') : t('common.signIn')}
            </button>

            <div className="alert alert-info">{t('login.routedNote')}</div>
          </form>
        </div>

        <footer className="login-footer">{t('login.legal')}</footer>
      </section>
    </div>
  )
}
