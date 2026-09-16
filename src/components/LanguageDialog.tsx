import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguages } from '../language/LanguageContext'
import { LANGUAGES } from '../lib/languages'
import '../styles/language.css'

export type LanguageDialogMode = 'interface' | 'call'

/** Change either language setting from inside a console, without signing out. */
export function LanguageDialog({ mode, onClose }: { mode: LanguageDialogMode; onClose: () => void }) {
  const { t } = useTranslation()
  const { uiLanguage, setUiLanguage, callLanguage, setCallLanguage } = useLanguages()
  const current = mode === 'interface' ? uiLanguage : callLanguage
  const [selected, setSelected] = useState(current.code)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const save = () => {
    if (mode === 'interface') setUiLanguage(selected)
    else setCallLanguage(selected)
    onClose()
  }

  const title = mode === 'interface' ? t('language.interfaceDialogTitle') : t('language.callDialogTitle')

  return (
    <div className="language-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="language-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="language-dialog-head">
          <div>
            <span className="language-dialog-eyebrow">
              {mode === 'interface' ? t('language.interfaceDialogEyebrow') : t('language.callDialogEyebrow')}
            </span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="language-dialog-close" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <p className="language-dialog-note">
          {mode === 'interface' ? t('language.interfaceDialogNote') : t('language.callDialogNote')}
        </p>

        <div className="language-dialog-grid" role="radiogroup" aria-label={t('language.chooseAria')}>
          {LANGUAGES.map((option) => {
            const isSelected = option.code === selected
            return (
              <button
                type="button"
                key={option.code}
                role="radio"
                aria-checked={isSelected}
                className={isSelected ? 'language-mini is-selected' : 'language-mini'}
                onClick={() => setSelected(option.code)}
              >
                <span lang={option.code} style={{ fontFamily: option.fontFamily }} className="language-mini-native">
                  {option.nativeName}
                </span>
                <span className="language-mini-english">{option.englishName}</span>
              </button>
            )
          })}
        </div>

        <div className="language-dialog-actions">
          <button type="button" className="btn btn-outline btn-small" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary btn-small" onClick={save}>
            {t('language.saveLanguage')}
          </button>
        </div>
      </div>
    </div>
  )
}
