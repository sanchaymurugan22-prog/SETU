import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CALL_SUB_TYPES,
  formatDuration,
  OUTCOME_KEYS,
  type CallSubType,
  type OutcomeKey,
} from '../../data/jharkhandCalls'
import { useCallSession } from './CallSessionContext'

type Period = 'all' | 'today' | 'week' | 'month'

const PERIOD_DAYS: Record<Period, number> = { all: 3650, today: 0, week: 7, month: 31 }

/**
 * Only this executive's own calls, and only report content: no name, phone or village
 * appears here — that is the privacy rule, not a gap in the data.
 */
export function CompletedCallsSection({
  titleKey = 'sections.executive.completed.title',
  scopeValueKey = 'callConsole.completed.scopeValue',
}: {
  titleKey?: string
  scopeValueKey?: string
} = {}) {
  const { t } = useTranslation()
  const { completed } = useCallSession()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('all')
  const [outcome, setOutcome] = useState<OutcomeKey | 'all'>('all')
  const [subType, setSubType] = useState<CallSubType | 'all'>('all')

  const title = t(titleKey)
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return completed.filter((call) => {
      const matchesSearch =
        !needle ||
        call.discussion.toLowerCase().includes(needle) ||
        call.course.toLowerCase().includes(needle) ||
        call.ref.toLowerCase().includes(needle) ||
        call.actions.some((action) => action.toLowerCase().includes(needle))
      const matchesPeriod = call.daysAgo <= PERIOD_DAYS[period]
      const matchesOutcome = outcome === 'all' || call.outcome === outcome
      const matchesSubType = subType === 'all' || call.subType === subType
      return matchesSearch && matchesPeriod && matchesOutcome && matchesSubType
    })
  }, [completed, outcome, period, search, subType])

  const hasSubTypes = useMemo(() => completed.some((call) => call.subType), [completed])
  const subTypeCounts = useMemo(() => {
    const map = new Map<CallSubType, number>()
    for (const call of completed) if (call.subType) map.set(call.subType, (map.get(call.subType) ?? 0) + 1)
    return map
  }, [completed])

  return (
    <>
      <header className="section-header call-completed-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">{t('callConsole.completed.subtitle', { count: completed.length })}</p>
        </div>
        <div className="call-completed-chips">
          <span className="chip is-cyan">{t('callConsole.completed.identityNote')}</span>
          <span className="call-scope">
            <span className="call-scope-label">{t('callConsole.completed.scopeLabel')}</span>
            <span className="call-scope-value">{t(scopeValueKey)}</span>
          </span>
        </div>
      </header>

      <div className="section-body call-completed-body">
        {hasSubTypes && (
          <div className="call-filters">
            <span className="call-filter-label">{t('resourcePerson.calls.subTypeLabel')}</span>
            <button
              type="button"
              className={subType === 'all' ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setSubType('all')}
            >
              {t('common.all')} · {completed.length}
            </button>
            {CALL_SUB_TYPES.map((kind) => (
              <button
                key={kind}
                type="button"
                className={subType === kind ? 'call-chip is-selected' : 'call-chip'}
                onClick={() => setSubType(subType === kind ? 'all' : kind)}
              >
                {t(`resourcePerson.calls.subType.${kind}`)} · {subTypeCounts.get(kind) ?? 0}
              </button>
            ))}
          </div>
        )}

        <div className="call-filters">
          <label className="call-search">
            <span className="visually-hidden">{t('callConsole.completed.searchLabel')}</span>
            <input
              type="search"
              value={search}
              placeholder={t('callConsole.completed.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          {(['all', 'today', 'week', 'month'] as Period[]).map((option) => (
            <button
              key={option}
              type="button"
              className={period === option ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setPeriod(option)}
            >
              {t(`callConsole.completed.period${option.charAt(0).toUpperCase()}${option.slice(1)}`)}
            </button>
          ))}

          <label className="call-select">
            <span className="visually-hidden">{t('callConsole.completed.headerOutcome')}</span>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as OutcomeKey | 'all')}>
              <option value="all">{t('callConsole.completed.outcomeAll')}</option>
              {OUTCOME_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`callConsole.outcome.${key}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="call-completed-panel">
          <div className="call-completed-head" aria-hidden="true">
            <span>{t('callConsole.completed.headerWhen')}</span>
            <span>{t('callConsole.completed.headerDiscussed')}</span>
            <span>{t('callConsole.completed.headerCourse')}</span>
            <span>{t('callConsole.completed.headerActions')}</span>
            <span>{t('callConsole.completed.headerOutcome')}</span>
          </div>

          {visible.length === 0 ? (
            <p className="call-empty">{t('callConsole.completed.empty')}</p>
          ) : (
            <ul className="call-completed-rows">
              {visible.map((call) => (
                <li className="call-completed-row" key={call.callId}>
                  <span className="call-when">
                    <span className="call-when-label">{call.whenLabel}</span>
                    <span className="call-when-meta">
                      {formatDuration(call.durationSeconds)} · {t('callConsole.completed.ref', { ref: call.ref })}
                    </span>
                    <span className="call-when-meta">
                      {call.detection.languageName}
                      <span className="call-confidence">
                        {t('detection.confidenceShort', { score: call.detection.confidence.toFixed(2) })}
                      </span>
                    </span>
                    {call.daysAgo === 0 && <span className="chip is-cyan">{t('callConsole.completed.justSent')}</span>}
                  </span>
                  <span className="call-discussed">{call.discussion}</span>
                  <span className="call-course">
                    {call.course}
                    {call.subType && (
                      <span className="call-subtype">{t(`resourcePerson.calls.subType.${call.subType}`)}</span>
                    )}
                  </span>
                  <ul className="call-actions">
                    {call.actions.map((action, index) => (
                      <li key={`${action}-${index}`}>{action}</li>
                    ))}
                  </ul>
                  <span className={`call-outcome is-${call.outcome}`}>{t(`callConsole.outcome.${call.outcome}`)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="call-queue-foot">
            <span>{t('callConsole.completed.countLine', { shown: visible.length, total: completed.length })}</span>
          </div>
        </div>
      </div>
    </>
  )
}
