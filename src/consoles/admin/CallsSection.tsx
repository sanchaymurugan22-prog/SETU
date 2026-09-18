import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AI_OUTCOMES,
  aiOutcomeCounts,
  automationFunnel,
  loadSystemCalls,
  type AiOutcome,
  type CallHandler,
} from '../../data/adminConsole'
import { CALL_SUB_TYPES, formatDuration, type CallSubType } from '../../data/jharkhandCalls'
import { isDialectGap, languageNameFor } from '../../lib/languageDetection'
import { useDataSource } from '../../data/useDataSource'
import { SourceBadge } from './SourceBadge'
import '../../styles/admin.css'

type Period = 'all' | 'week' | 'month'

const PERIOD_DAYS: Record<Period, number> = { all: 3650, week: 7, month: 31 }

/**
 * Every call in the system, in three parts. The automation funnel sits inside AI Calls,
 * where the spec puts it: the share the AI closed without a human is the scalability
 * claim, and it belongs beside the calls it is claiming about.
 */
export function CallsSection() {
  const { t } = useTranslation()
  const source = useDataSource('calls')
  const all = loadSystemCalls()
  const [part, setPart] = useState<CallHandler>('executive')
  const [period, setPeriod] = useState<Period>('all')
  const [outcome, setOutcome] = useState<AiOutcome | 'all'>('all')
  const [subType, setSubType] = useState<CallSubType | 'all'>('all')
  const [search, setSearch] = useState('')

  const title = t('sections.admin.calls.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const funnel = useMemo(() => automationFunnel(all), [all])
  const outcomes = useMemo(() => aiOutcomeCounts(all), [all])
  const aiShare = funnel.find((slice) => slice.handler === 'ai')?.share ?? 0

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return all.filter((call) => {
      if (call.handler !== part) return false
      if (call.daysAgo > PERIOD_DAYS[period]) return false
      if (part === 'ai' && outcome !== 'all' && call.aiOutcome !== outcome) return false
      if (part === 'resourcePerson' && subType !== 'all' && call.subType !== subType) return false
      if (!needle) return true
      return (
        call.beneficiaryName.toLowerCase().includes(needle) ||
        call.summary.toLowerCase().includes(needle) ||
        call.block.toLowerCase().includes(needle) ||
        (call.handlerName ?? '').toLowerCase().includes(needle)
      )
    })
  }, [all, outcome, part, period, search, subType])

  const shown = visible.slice(0, 40)

  return (
    <>
      <header className="section-header admin-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">{t('admin.calls.subtitle', { total: all.length, aiShare })}</p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('admin.calls.scopeLabel')}</span>
          <span className="call-scope-value">{t('admin.calls.scopeValue')}</span>
        </div>
        <SourceBadge state={source} count={all.length} />
      </header>

      <div className="section-body admin-body">
        <div className="admin-tabs" role="tablist">
          {(['executive', 'resourcePerson', 'ai'] as CallHandler[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={part === option}
              className={part === option ? 'admin-tab is-active' : 'admin-tab'}
              onClick={() => setPart(option)}
            >
              {t(`admin.calls.part.${option}`)}
              <span className="admin-tab-count">{all.filter((call) => call.handler === option).length}</span>
            </button>
          ))}
        </div>

        {part === 'ai' && (
          <section className="admin-funnel" aria-label={t('admin.calls.funnelTitle')}>
            <div className="admin-funnel-head">
              <div>
                <span className="admin-funnel-eyebrow">{t('admin.calls.funnelTitle')}</span>
                <p className="admin-funnel-claim">{t('admin.calls.funnelClaim', { share: aiShare })}</p>
              </div>
              <span className="admin-funnel-total">{t('admin.calls.funnelTotal', { total: all.length })}</span>
            </div>

            <div className="admin-funnel-bar" role="img" aria-label={t('admin.calls.funnelTitle')}>
              {funnel.map((slice) => (
                <span
                  key={slice.handler}
                  className={`admin-funnel-slice is-${slice.handler}`}
                  style={{ width: `${slice.share}%` }}
                />
              ))}
            </div>

            <div className="admin-funnel-legend">
              {funnel.map((slice) => (
                <div className="admin-funnel-item" key={slice.handler}>
                  <span className={`admin-funnel-dot is-${slice.handler}`} aria-hidden="true" />
                  <span className="admin-funnel-label">{t(`admin.calls.part.${slice.handler}`)}</span>
                  <span className="admin-funnel-value">{slice.share}%</span>
                  <span className="admin-funnel-sub">{t('admin.calls.funnelCalls', { count: slice.calls })}</span>
                </div>
              ))}
            </div>

            <div className="admin-outcome-row">
              {outcomes.map((entry) => (
                <div className="admin-outcome" key={entry.outcome}>
                  <span className={`admin-outcome-value is-${entry.outcome}`}>{entry.calls}</span>
                  <span className="admin-outcome-label">{t(`admin.calls.aiOutcome.${entry.outcome}`)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="call-filters">
          <label className="call-search">
            <span className="visually-hidden">{t('admin.calls.searchLabel')}</span>
            <input
              type="search"
              value={search}
              placeholder={t('admin.calls.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          {(['all', 'week', 'month'] as Period[]).map((option) => (
            <button
              key={option}
              type="button"
              className={period === option ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setPeriod(option)}
            >
              {t(`admin.calls.period.${option}`)}
            </button>
          ))}

          {part === 'ai' && (
            <label className="call-select">
              <span className="visually-hidden">{t('admin.calls.outcomeLabel')}</span>
              <select value={outcome} onChange={(event) => setOutcome(event.target.value as AiOutcome | 'all')}>
                <option value="all">{t('admin.calls.outcomeAll')}</option>
                {AI_OUTCOMES.map((key) => (
                  <option key={key} value={key}>
                    {t(`admin.calls.aiOutcome.${key}`)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {part === 'resourcePerson' && (
            <label className="call-select">
              <span className="visually-hidden">{t('resourcePerson.calls.subTypeLabel')}</span>
              <select value={subType} onChange={(event) => setSubType(event.target.value as CallSubType | 'all')}>
                <option value="all">{t('common.all')}</option>
                {CALL_SUB_TYPES.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`resourcePerson.calls.subType.${kind}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-table-head admin-calls-grid" aria-hidden="true">
            <span>{t('admin.calls.headers.when')}</span>
            <span>{t('admin.calls.headers.beneficiary')}</span>
            <span>{t('admin.calls.headers.summary')}</span>
            <span>{part === 'ai' ? t('admin.calls.headers.aiOutcome') : t('admin.calls.headers.handledBy')}</span>
            <span>{t('detection.headerDetected')}</span>
          </div>

          {shown.length === 0 ? (
            <p className="call-empty">{t('admin.calls.empty')}</p>
          ) : (
            <ul className="admin-rows">
              {shown.map((call) => (
                <li className="admin-row admin-calls-grid" key={call.callId}>
                  <span className="ben-cell">
                    {call.whenLabel}
                    <span className="rp-cell-sub">{formatDuration(call.durationSeconds)}</span>
                  </span>
                  <span className="ben-cell-name">
                    <span className="ben-name">{call.beneficiaryName}</span>
                    <span className="ben-id">
                      {call.block} · {call.district}
                    </span>
                  </span>
                  <span className="ben-cell">
                    {call.summary}
                    {call.subType && (
                      <span className="call-subtype">{t(`resourcePerson.calls.subType.${call.subType}`)}</span>
                    )}
                    {call.escalationReason && (
                      <span className="admin-escalation">
                        {t('admin.calls.escalationReason', { reason: call.escalationReason })}
                      </span>
                    )}
                  </span>
                  <span className="ben-cell">
                    {call.handler === 'ai' ? (
                      <>
                        <span className={`chip is-ai-${call.aiOutcome}`}>
                          {t(`admin.calls.aiOutcome.${call.aiOutcome ?? 'fully-handled'}`)}
                        </span>
                        <span className="rp-cell-sub">
                          {t('admin.calls.confidence', { score: (call.confidence ?? 0).toFixed(2) })}
                        </span>
                      </>
                    ) : (
                      <>
                        {call.handlerName}
                        <span className="rp-cell-sub">{t(`admin.calls.part.${call.handler}`)}</span>
                      </>
                    )}
                  </span>
                  <span className="ben-cell">
                    {call.detection.languageName}
                    {call.detection.secondary && isDialectGap(call.detection) && (
                      <span className="call-contested">
                        {t('detection.contestedPair', {
                          primary: call.detection.languageName,
                          secondary: languageNameFor(call.detection.secondary.langCode),
                        })}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="call-queue-foot">
            <span>{t('common.showing', { from: 1, to: shown.length, total: visible.length })}</span>
            <span className="call-queue-ticking">{t('admin.calls.foot')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
