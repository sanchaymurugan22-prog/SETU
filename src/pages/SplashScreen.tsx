import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SetuMark } from '../components/SetuMark'

/** How long the splash holds on first load, and how long it takes to fade. */
const SPLASH_VISIBLE_MS = 3000
const SPLASH_FADE_MS = 450

export function SplashScreen() {
  const { t } = useTranslation()

  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-center">
        <SetuMark size={140} />
        <div className="splash-wordmark">SETU</div>
        <div className="splash-devanagari" lang="hi">
          सेतु
        </div>
        <div className="splash-divider" />
        <div className="splash-tagline">{t('splash.tagline')}</div>
        <div className="splash-loading">
          <span />
          <span />
          <span />
          {t('splash.loading')}
        </div>
      </div>
    </div>
  )
}

/**
 * Holds the splash over the app for a fixed moment on first load, then fades it out.
 * The app boots underneath, so this costs nothing after the splash clears — and sign-in,
 * which shows its own brief loading splash, is never delayed by it.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible')

  useEffect(() => {
    const timer = setTimeout(() => setPhase('fading'), SPLASH_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = setTimeout(() => setPhase('done'), SPLASH_FADE_MS)
    return () => clearTimeout(timer)
  }, [phase])

  return (
    <>
      {children}
      {phase !== 'done' && (
        <div className={phase === 'fading' ? 'splash-overlay is-fading' : 'splash-overlay'} aria-hidden={phase === 'fading'}>
          <SplashScreen />
        </div>
      )}
    </>
  )
}
