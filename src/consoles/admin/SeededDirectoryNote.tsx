import { useTranslation } from 'react-i18next'

/**
 * The staff directory is the one part of the console that is not read from Firestore.
 * The real officials live in `users`, which the seeder deliberately never writes to —
 * those are working sign-in accounts. So these sections show seeded postings and activity
 * instead, and say so rather than letting the absent source badge speak for them.
 */
export function SeededDirectoryNote() {
  const { t } = useTranslation()
  return (
    <p className="admin-seeded-note">
      <span className="admin-seeded-note-label">{t('admin.staff.seededLabel')}</span>
      <span>{t('admin.staff.seededNote')}</span>
    </p>
  )
}
