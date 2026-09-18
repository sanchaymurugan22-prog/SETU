import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CALL_SUB_TYPES,
  formatDuration,
  REASON_TAGS,
  WAIT_TARGET_SECONDS,
  type CallSubType,
  type QueuedCall,
  type ReasonTag,
} from '../../data/jharkhandCalls'
import { isDialectGap, languageNameFor } from '../../lib/languageDetection'
import { ActiveCallPanel } from './ActiveCallPanel'
import { useDataSource } from '../../data/useDataSource'
import type { SlotName } from '../../data/source'
import { SourceBadge } from '../admin/SourceBadge'
import { useCallSession } from './CallSessionContext'

type SortMode = 'wait' | 'position'

/** Stage 1. No identity here: reason, wait, position and language only — and Accept. */
export function WaitingCallsSection({
  titleKey = 'sections.executive.waiting.title',
  subtitleKey = 'callConsole.queue.subtitle',
  slot = 'queue',
}: {
  titleKey?: string
  subtitleKey?: string
  /** Which Firestore query backs this queue: the executive's or the resource person's. */
  slot?: SlotName
} = {}) {
  const { t } = useTranslation()
  const source = useDataSource(slot)
  const { queue, active, accept, available, setAvailable, waitedSeconds } = useCallSession()
  const [reason, setReason] = useState<ReasonTag | 'all'>('all')
  const [subType, setSubType] = useState<CallSubType | 'all'>('all')
  const [sort, setSort] = useState<SortMode>('wait')

  const title = t(titleKey)
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

  // Only the Resource Person queue carries a sub-type; the tabs appear with it.
  const hasSubTypes = useMemo(() => queue.some((call) => call.subType), [queue])
  const subTypeCounts = useMemo(() => {
    const map = new Map<CallSubType, number>()
    for (const call of queue) if (call.subType) map.set(call.subType, (map.get(call.subType) ?? 0) + 1)
    return map
  }, [queue])

  const visible = useMemo(() => {
    const filtered = queue.filter(
      (call) =>
        (reason === 'all' || call.reasonTag === reason) && (subType === 'all' || call.subType === subType),
    )
    const sorted = [...filtered]
    if (sort === 'wait') sorted.sort((a, b) => waitedSeconds(b) - waitedSeconds(a))
    else sorted.sort((a, b) => (positions.get(a.callId) ?? 0) - (positions.get(b.callId) ?? 0))
    return sorted
  }, [positions, queue, reason, sort, subType, waitedSeconds])

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
            {t(subtitleKey, { count: queue.length, longest: formatDuration(longest) })}
          </p>
        </div>
        <div className="call-queue-controls">
          <SourceBadge state={source} count={queue.length} />
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
        {hasSubTypes && (
          <div className="call-filters">
            <span className="call-filter-label">{t('resourcePerson.calls.subTypeLabel')}</span>
            <button
              type="button"
              className={subType === 'all' ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setSubType('all')}
            >
              {t('common.all')} · {queue.length}
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
            <span className="call-transfer-note">{t('resourcePerson.calls.transferOnly')}</span>
          </div>
        )}

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
                      {call.subType && (
                        <span className="call-subtype">
                          {t(`resourcePerson.calls.subType.${call.subType}`)}
                          {call.transferredFrom
                            ? ` · ${t('resourcePerson.calls.transferredBy', { name: call.transferredFrom })}`
                            : ''}
                        </span>
                      )}
                    </span>
                    <span className="call-wait">
                      <span className={over ? 'call-wait-time is-over' : 'call-wait-time'}>{formatDuration(waited)}</span>
                      <span className="call-wait-note">{waitLabel(call)}</span>
                    </span>
                    <span className="call-where">
                      <span className="call-detected">
                        {call.detection.languageName}
                        {call.detection.confidence > 0 && (
                          <span className="call-confidence">
                            {t('detection.confidenceShort', { score: call.detection.confidence.toFixed(2) })}
                          </span>
                        )}
                      </span>
                      {call.detection.secondary && isDialectGap(call.detection) && (
                        <span className="call-contested">
                          {t('detection.contestedPair', {
                            primary: call.detection.languageName,
                            secondary: languageNameFor(call.detection.secondary.langCode),
                          })}
                        </span>
                      )}
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
