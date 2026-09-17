import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FOLLOW_UP_OUTCOMES,
  FOLLOW_UP_PURPOSES,
  loadFollowUps,
  type FollowUpOutcome,
  type FollowUpPurpose,
} from '../../data/adminConsole'
import { formatLastContact } from '../../i18n/format'
import '../../styles/admin.css'

/** Everything the automated follow-up engine has done, per beneficiary (SETU-SPEC 6.5). */
export function FollowUpsSection() {
  const { t } = useTranslation()
  const all = loadFollowUps()
  const [search, setSearch] = useState('')
  const [purpose, setPurpose] = useState<FollowUpPurpose | 'all'>('all')
  const [outcome, setOutcome] = useState<FollowUpOutcome | 'all'>('all')

  const title = t('sections.admin.follow-ups.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return all.filter(
      (record) =>
        (purpose === 'all' || record.purpose === purpose) &&
        (outcome === 'all' || record.outcome === outcome) &&
        (!needle ||
          record.name.toLowerCase().includes(needle) ||
          record.beneficiaryId.toLowerCase().includes(needle) ||
          record.block.toLowerCase().includes(needle)),
    )
  }, [all, outcome, purpose, search])

  const totalCalls = all.reduce((sum, record) => sum + record.callCount, 0)
  const problems = all.filter((record) => record.outcome === 'problem-found' || record.outcome === 'escalated').length
  const noAnswer = all.filter((record) => record.outcome === 'no-answer').length
  const shown = visible.slice(0, 40)

  return (
    <>
      <header className="section-header admin-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('admin.followUps.subtitle', { calls: totalCalls, people: all.length })}
          </p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('admin.followUps.engineLabel')}</span>
          <span className="call-scope-value">{t('admin.followUps.engineValue')}</span>
        </div>
      </header>

      <div className="section-body admin-body">
        <div className="admin-stat-row">
          <article className="gap-card">
            <span className="gap-card-label">{t('admin.followUps.cards.callsLabel')}</span>
            <span className="gap-card-value">{totalCalls}</span>
            <span className="gap-card-foot">{t('admin.followUps.cards.callsFoot', { people: all.length })}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('admin.followUps.cards.answeredLabel')}</span>
            <span className="gap-card-value">
              {Math.round(((all.length - noAnswer) / Math.max(1, all.length)) * 100)}
              <span className="gap-card-unit">%</span>
            </span>
            <span className="gap-card-foot">{t('admin.followUps.cards.answeredFoot', { count: noAnswer })}</span>
          </article>
          <article className="gap-card is-warn">
            <span className="gap-card-label">{t('admin.followUps.cards.problemsLabel')}</span>
            <span className="gap-card-value">{problems}</span>
            <span className="gap-card-foot">{t('admin.followUps.cards.problemsFoot')}</span>
          </article>
        </div>

        <div className="call-filters">
          <label className="call-search">
            <span className="visually-hidden">{t('admin.followUps.searchLabel')}</span>
            <input
              type="search"
              value={search}
              placeholder={t('admin.followUps.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="call-select">
            <span className="visually-hidden">{t('admin.followUps.purposeLabel')}</span>
            <select value={purpose} onChange={(event) => setPurpose(event.target.value as FollowUpPurpose | 'all')}>
              <option value="all">{t('admin.followUps.purposeAll')}</option>
              {FOLLOW_UP_PURPOSES.map((key) => (
                <option key={key} value={key}>
                  {t(`admin.followUps.purpose.${key}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="call-select">
            <span className="visually-hidden">{t('admin.followUps.outcomeLabel')}</span>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as FollowUpOutcome | 'all')}>
              <option value="all">{t('admin.followUps.outcomeAll')}</option>
              {FOLLOW_UP_OUTCOMES.map((key) => (
                <option key={key} value={key}>
                  {t(`admin.followUps.outcome.${key}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-panel">
          <div className="admin-table-head admin-followup-grid" aria-hidden="true">
            <span>{t('beneficiaries.headers.name')}</span>
            <span>{t('admin.followUps.headers.count')}</span>
            <span>{t('admin.followUps.headers.purpose')}</span>
            <span>{t('admin.followUps.headers.last')}</span>
            <span>{t('admin.followUps.headers.outcome')}</span>
            <span>{t('admin.followUps.headers.next')}</span>
          </div>

          {shown.length === 0 ? (
            <p className="call-empty">{t('admin.followUps.empty')}</p>
          ) : (
            <ul className="admin-rows">
              {shown.map((record) => (
                <li className="admin-row admin-followup-grid" key={record.beneficiaryId}>
                  <span className="ben-cell-name">
                    <span className="ben-name">{record.name}</span>
                    <span className="ben-id">
                      {record.beneficiaryId} · {record.block}
                    </span>
                  </span>
                  <span className="ben-cell">
                    <span className="admin-count">{record.callCount}</span>
                    <span className="rp-cell-sub">{record.course}</span>
                  </span>
                  <span className="ben-cell">
                    {t(`admin.followUps.purpose.${record.purpose}`)}
                    <span className="rp-cell-sub">{record.detail}</span>
                  </span>
                  <span className="ben-cell is-muted">
                    {record.lastWhenLabel}
                    <span className="rp-cell-sub">{formatLastContact(t, record.lastDaysAgo)}</span>
                  </span>
                  <span className="ben-cell">
                    <span className={`chip is-followup-${record.outcome}`}>
                      {t(`admin.followUps.outcome.${record.outcome}`)}
                    </span>
                  </span>
                  <span className="ben-cell is-muted">
                    {record.nextDueLabel ?? t('admin.followUps.noneDue')}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="call-queue-foot">
            <span>{t('common.showing', { from: 1, to: shown.length, total: visible.length })}</span>
            <span className="call-queue-ticking">{t('admin.followUps.foot')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
