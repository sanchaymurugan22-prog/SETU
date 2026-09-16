import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Role } from '../auth/roles'
import type { ConsoleSection } from './consoles'

export function SectionPlaceholder({ role, section }: { role: Role; section: ConsoleSection }) {
  const { t } = useTranslation()
  const title = t(`sections.${role}.${section.path}.title`, { defaultValue: section.title })
  const summary = t(`sections.${role}.${section.path}.summary`, { defaultValue: section.summary })

  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  return (
    <>
      <header className="section-header">
        <h1>{title}</h1>
      </header>
      <div className="section-body">
        <div className="placeholder">
          <span className="eyebrow">{t('placeholder.eyebrow')}</span>
          <p className="placeholder-summary">{summary}</p>
          <p className="placeholder-note">{t('placeholder.note')}</p>
        </div>
      </div>
    </>
  )
}
