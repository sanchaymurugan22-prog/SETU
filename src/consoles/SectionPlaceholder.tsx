import { useEffect } from 'react'
import type { ConsoleSection } from './consoles'

export function SectionPlaceholder({ section }: { section: ConsoleSection }) {
  useEffect(() => {
    document.title = `${section.title} · SETU`
  }, [section.title])

  return (
    <>
      <header className="section-header">
        <h1>{section.title}</h1>
      </header>
      <div className="section-body">
        <div className="placeholder">
          <span className="eyebrow">Not built yet</span>
          <p className="placeholder-summary">{section.summary}</p>
          <p className="placeholder-note">This section is an empty shell. Its features arrive in a later build step.</p>
        </div>
      </div>
    </>
  )
}
