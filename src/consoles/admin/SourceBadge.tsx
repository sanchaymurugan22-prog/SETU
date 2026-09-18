import { useTranslation } from 'react-i18next'
import type { SlotState } from '../../data/source'
import '../../styles/admin.css'

/**
 * Says where the data on screen came from. Deliberately visible: an admin — and anyone
 * watching a demo — should be able to tell live Firestore from the seeded sample without
 * opening devtools.
 */
export function SourceBadge({ state, count }: { state: SlotState<unknown>; count: number }) {
  const { t } = useTranslation()

  return (
    <span className={`source-badge is-${state.status}`} title={state.error ?? undefined}>
      <span className="source-badge-dot" aria-hidden="true" />
      <span className="source-badge-text">
        {t(`source.${state.status}`, { count })}
      </span>
      {state.status === 'error' && <span className="source-badge-note">{t('source.fellBack')}</span>}
    </span>
  )
}
