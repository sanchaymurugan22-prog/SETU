import type { TFunction } from 'i18next'

/** "Today", "3 days ago", "2 months ago" — in the current interface language. */
export function formatLastContact(t: TFunction, days: number): string {
  if (days <= 0) return t('time.today')
  if (days === 1) return t('time.yesterday')
  if (days < 14) return t('time.daysAgo', { count: days })
  if (days < 60) return t('time.weeksAgo', { count: Math.round(days / 7) })
  return t('time.monthsAgo', { count: Math.round(days / 30) })
}
