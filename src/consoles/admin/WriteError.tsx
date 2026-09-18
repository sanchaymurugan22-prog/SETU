import { useTranslation } from 'react-i18next'

/**
 * What the official sees when a write did not land. It says the change was not saved,
 * because by the time this renders the optimistic update has already been rolled back and
 * the screen is showing the old value again.
 */
export function WriteError({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  const { t } = useTranslation()
  if (!error) return null
  return (
    <div className="write-error" role="alert">
      <span className="write-error-label">{t('writes.failedLabel')}</span>
      <span className="write-error-body">{error}</span>
      <button type="button" className="link-button" onClick={onDismiss}>
        {t('common.dismiss')}
      </button>
    </div>
  )
}
