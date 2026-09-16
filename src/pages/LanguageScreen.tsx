import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { SetuMark } from '../components/SetuMark'
import { homePathFor } from '../consoles/consoles'
import { useLanguages } from '../language/LanguageContext'
import { LANGUAGES } from '../lib/languages'
import { SplashScreen } from './SplashScreen'
import '../styles/language.css'

/** Shown after the splash and before sign-in, while nobody is signed in. */
export function LanguageScreen() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const { uiLanguage, setUiLanguage, confirmLanguage } = useLanguages()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.title = `${t('language.screenTitle')} · SETU`
  }, [t])

  if (state.status === 'loading') return <SplashScreen />
  // Already signed in: skip the screen entirely and go to their console.
  if (state.status === 'ready') return <Navigate to={homePathFor(state.staff.role)} replace />
  if (state.status !== 'signed-out') return <Navigate to="/" replace />

  const handleContinue = () => {
    confirmLanguage(uiLanguage.code)
    navigate('/login', { replace: true, state: location.state })
  }

  return (
    <div className="language-screen">
      <header className="language-bar">
        <SetuMark size={38} tone="onDark" />
        <span className="language-wordmark">SETU</span>
        <span className="language-ministry">{t('common.ministry')}</span>
      </header>

      <main className="language-main">
        <div className="language-heading">
          <h1>{t('language.screenTitle')}</h1>
          <div className="language-note">
            <span className="language-note-dot" aria-hidden="true" />
            <span>{t('language.screenNote')}</span>
          </div>
        </div>

        <div className="language-grid" role="radiogroup" aria-label={t('language.chooseAria')}>
          {LANGUAGES.map((option) => {
            const isSelected = option.code === uiLanguage.code
            return (
              <button
                type="button"
                key={option.code}
                role="radio"
                aria-checked={isSelected}
                className={isSelected ? 'language-card is-selected' : 'language-card'}
                /* Switches the whole interface at once — no reload, no Continue needed. */
                onClick={() => setUiLanguage(option.code)}
                onDoubleClick={handleContinue}
              >
                <span className="language-native" lang={option.code} style={{ fontFamily: option.fontFamily }}>
                  {option.nativeName}
                </span>
                <span className="language-card-foot">
                  <span className="language-english">{option.englishName}</span>
                  {isSelected && (
                    <span className="language-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="language-actions">
          <span className="language-hint">{t('language.hint')}</span>
          <button type="button" className="btn btn-primary language-continue" onClick={handleContinue}>
            {t('common.continue')}
          </button>
        </div>
      </main>
    </div>
  )
}
