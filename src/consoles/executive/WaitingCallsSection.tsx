import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDuration, REASON_TAGS, WAIT_TARGET_SECONDS, type QueuedCall, type ReasonTag } from '../../data/jharkhandCalls'
import { isDialectGap } from '../../lib/languageDetection'
import { ActiveCallPanel } from './ActiveCallPanel'
import { useCallSession } from './CallSessionContext'

type SortMode = 'wait' | 'position'

/** Stage 1. No identity here: reason, wait, position and language only — and Accept. */
export function WaitingCallsSection() {
  const { t } = useTranslation()
  const { queue, active, accept, available, setAvailable, waitedSeconds } = useCallSession()
  const [reason, setReason] = useState<ReasonTag | 'all'>('all')
  const [sort, setSort] = useState<SortMode>('wait')

  const title = t('sections.executive.waiting.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  // Position is the caller's place in the queue, independent of how the list is sorted.
  const positions = useMemo(() => new Map(queue.map((call, index) => [call.callId, index + 1])), [queue])

  const counts = useMemo(() => {
    const map = new Map<ReasonTag, number>()
    for (const call of queue) map.set(call.reasonTag, (map.get(call.reasonTag) ?? 0) + 1)
    return map
  }, [queue])

  const visible = useMemo(() => {
    const filtered = reason === 'all' ? queue : queue.filter((call) => call.reasonTag === reason)
    const sorted = [...filtered]
    if (sort === 'wait') sorted.sort((a, b) => waitedSeconds(b) - waitedSeconds(a))
    else sorted.sort((a, b) => (positions.get(a.callId) ?? 0) - (positions.get(b.callId) ?? 0))
    return sorted
  }, [positions, queue, reason, sort, waitedSeconds])

  if (active) return <ActiveCallPanel />

  const longest = queue.reduce((max, call) => Math.max(max, waitedSeconds(call)), 0)

  const waitLabel = (call: QueuedCall) => {
    const waited = waitedSeconds(call)
    if (waited > WAIT_TARGET_SECONDS) return t('callConsole.queue.overTarget', { minutes: WAIT_TARGET_SECONDS / 60 })
    if (waited < 60) return t('callConsole.queue.justJoined')
    return t('callConsole.queue.withinTarget')
  }

  return (
    <>
      <header className="section-header call-queue-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('callConsole.queue.subtitle', { count: queue.length, longest: formatDuration(longest) })}
          </p>
        </div>
        <div className="call-queue-controls">
          <span className="chip is-cyan">{t('callConsole.queue.identityHidden')}</span>
          <button
            type="button"
            className={available ? 'call-available is-on' : 'call-available'}
            aria-pressed={available}
            onClick={() => setAvailable(!available)}
          >
            <span className="call-available-switch" aria-hidden="true" />
            {available ? t('callConsole.queue.available') : t('callConsole.queue.unavailable')}
          </button>
        </div>
      </header>

      <div className="section-body call-queue-body">
        <div className="call-filters">
          <span className="call-filter-label">{t('callConsole.queue.reasonLabel')}</span>
          <button
            type="button"
            className={reason === 'all' ? 'call-chip is-selected' : 'call-chip'}
            onClick={() => setReason('all')}
          >
            {t('common.all')} · {queue.length}
          </button>
          {REASON_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={reason === tag ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setReason(reason === tag ? 'all' : tag)}
            >
              {t(`callConsole.reason.${tag}`)} · {counts.get(tag) ?? 0}
            </button>
          ))}

          <span className="call-sort">
            <span className="call-filter-label">{t('callConsole.queue.sortLabel')}</span>
            <button
              type="button"
              className={sort === 'wait' ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setSort('wait')}
            >
              {t('callConsole.queue.sortLongestWait')} ↓
            </button>
            <button
              type="button"
              className={sort === 'position' ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setSort('position')}
            >
              {t('callConsole.queue.sortPosition')}
            </button>
          </span>
        </div>

        {!available && <p className="call-unavailable-hint">{t('callConsole.queue.unavailableHint', { label: t('callConsole.queue.available') })}</p>}

        <div className="call-queue-panel">
          <div className="call-queue-head" aria-hidden="true">
            <span>{t('callConsole.queue.headerPosition')}</span>
            <span>{t('callConsole.queue.headerReason')}</span>
            <span>{t('callConsole.queue.headerWaiting')}</span>
            <span>{t('detection.headerDetected')}</span>
            <span />
          </div>

          {visible.length === 0 ? (
            <p className="call-empty">{t('callConsole.queue.empty')}</p>
          ) : (
            <ul className="call-queue-rows">
              {visible.map((call) => {
                const waited = waitedSeconds(call)
                const over = waited > WAIT_TARGET_SECONDS
                return (
                  <li className="call-queue-row" key={call.callId}>
                    <span className="call-position">{String(positions.get(call.callId) ?? 0).padStart(2, '0')}</span>
                    <span className="call-reason">
                      <span className={`call-tag is-${call.reasonTag}`}>{t(`callConsole.reason.${call.reasonTag}`)}</span>
                      <span className="call-reason-detail">{call.reasonDetail}</span>
                    </span>
                    <span className="call-wait">
                      <span className={over ? 'call-wait-time is-over' : 'call-wait-time'}>{formatDuration(waited)}</span>
                      <span className="call-wait-note">{waitLabel(call)}</span>
                    </span>
                    <span className="call-where">
                      <span className="call-detected">
                        {call.detection.languageName}
                        <span className="call-confidence">
                          {t('detection.confidenceShort', { score: call.detection.confidence.toFixed(2) })}
                        </span>
                      </span>
                      <span className="call-where-place">
                        {call.district}, {call.block}
                      </span>
                      {isDialectGap(call.detection) && (
                        <span className="call-dialect-gap">{t('detection.dialectGap')}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      disabled={!available}
                      onClick={() => accept(call.callId)}
                    >
                      {t('callConsole.queue.accept')}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="call-queue-foot">
            <span>{t('callConsole.queue.foot')}</span>
            <span className="call-queue-ticking">{t('callConsole.queue.ticking')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
