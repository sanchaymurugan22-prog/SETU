import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSignOut } from '../auth/useSignOut'
import { LanguageDialog, type LanguageDialogMode } from '../components/LanguageDialog'
import { SetuMark } from '../components/SetuMark'
import { useLanguages } from '../language/LanguageContext'
import type { ConsoleDefinition } from './consoles'

function initials(name: string): string {
  const letters = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
  return letters.length > 1 ? letters[0]! + letters[letters.length - 1]! : (letters[0] ?? '?')
}

export function ConsoleLayout({ definition }: { definition: ConsoleDefinition }) {
  const { t } = useTranslation()
  const { state } = useAuth()
  const { uiLanguage, callLanguage } = useLanguages()
  const signOut = useSignOut()
  const [dialog, setDialog] = useState<LanguageDialogMode | null>(null)

  // RequireRole only renders this for a ready official.
  if (state.status !== 'ready') return null
  const { staff } = state
  const groups = [...new Set(definition.sections.map((section) => section.group))]
  const consoleTitle = t(`console.titles.${definition.role}`, { defaultValue: definition.title })

  return (
    <div className="console">
      <nav className="console-nav" aria-label={consoleTitle}>
        <div className="console-brand">
          <SetuMark size={34} tone="onDark" />
          <span className="console-wordmark">SETU</span>
          <span className="console-badge">
            {t(`console.badges.${definition.role}`, { defaultValue: definition.badge.join(' ') })}
          </span>
        </div>

        {groups.map((group) => (
          <div className="console-group" key={group}>
            <span className="console-group-label">{t(`console.groups.${group}`, { defaultValue: group })}</span>
            {definition.sections
              .filter((section) => section.group === group)
              .map((section) => (
                <NavLink key={section.path} to={section.path} className="console-link">
                  {t(`sections.${definition.role}.${section.path}.title`, { defaultValue: section.title })}
                </NavLink>
              ))}
          </div>
        ))}

        <div className="console-user">
          <button type="button" className="console-language" onClick={() => setDialog('interface')}>
            <span className="console-language-label">{t('language.interfaceLabel')}</span>
            <span className="console-language-value" lang={uiLanguage.code} style={{ fontFamily: uiLanguage.fontFamily }}>
              {uiLanguage.nativeName}
            </span>
          </button>

          <button type="button" className="console-language" onClick={() => setDialog('call')}>
            <span className="console-language-label">{t('language.callLabel')}</span>
            <span
              className="console-language-value"
              lang={callLanguage.code}
              style={{ fontFamily: callLanguage.fontFamily }}
            >
              {callLanguage.nativeName}
            </span>
          </button>

          <div className="console-user-row">
            <span className="console-avatar" aria-hidden="true">
              {initials(staff.name)}
            </span>
            <div className="console-user-text">
              <span className="console-user-name">{staff.name}</span>
              <span className="console-user-role">
                {t(`roles.${staff.role}`)}
                {staff.languages.length > 0 && ` · ${staff.languages.join(', ')}`}
              </span>
            </div>
          </div>

          <button type="button" className="console-signout" onClick={() => void signOut()}>
            {t('common.signOut')}
          </button>
          <span className="console-ministry">
            {t('common.ministryLine1')}
            <br />
            {t('common.ministryLine2')}
          </span>
        </div>
      </nav>

      <main className="console-main">
        <Outlet />
      </main>

      {dialog && <LanguageDialog mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}
