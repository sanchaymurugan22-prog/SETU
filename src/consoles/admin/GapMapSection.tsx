import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { callDetections } from '../../data/jharkhandCalls'
import { dialectAccuracy } from '../../data/languageDetections'
import {
  courseDemand,
  DEFAULT_WINDOW,
  DIALECT_THRESHOLD,
  formatNumber,
  gapsInWindow,
  PLACEMENT_TARGET,
  statewideTotals,
  TIME_WINDOWS,
  type BlockGap,
  type WindowDays,
} from '../../data/jharkhandGaps'
import { GapMap, type FocusRequest, type GapAction } from './GapMap'
import '../../styles/gap-map.css'

const SEVERITY_BADGE: Record<BlockGap['severity'], string> = { high: 'P1', medium: 'P2', low: 'P3' }

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

export function GapMapSection() {
  const { t } = useTranslation()
  const [windowDays, setWindowDays] = useState<WindowDays>(DEFAULT_WINDOW)
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [notice, setNotice] = useState<{ gap: BlockGap; action: GapAction } | null>(null)

  const title = t('sections.admin.gap-map.title')

  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const gaps = useMemo(() => gapsInWindow(windowDays), [windowDays])
  const totals = statewideTotals(windowDays)
  const demandByCourse = useMemo(() => courseDemand(gaps), [gaps])

  const enrollmentRate = percent(totals.enrolled, totals.callers)
  const completionRate = percent(totals.completed, totals.enrolled)
  const placementRate = percent(totals.placed, totals.completed)
  const unplaced = totals.completed - totals.placed

  const demandBlocks = gaps.filter((gap) => gap.gapType === 'no-centre')
  const unplacedBlocks = gaps.filter((gap) => gap.gapType === 'no-local-jobs')
  // Dialect gaps are the languages SETU hears least reliably, averaged from the
  // confidence the detector reported on every call.
  const dialectGaps = useMemo(
    () => dialectAccuracy(callDetections()).filter((entry) => entry.accuracy < DIALECT_THRESHOLD),
    [],
  )
  const topDemand = demandByCourse[0]?.people ?? 1
  const priorityGaps = gaps.slice(0, 6)

  const delta = (points: number) =>
    points >= 0
      ? t('gapMap.deltaUp', { points: Math.abs(points).toFixed(1) })
      : t('gapMap.deltaDown', { points: Math.abs(points).toFixed(1) })

  return (
    <>
      <header className="section-header gap-header">
        <div>
          <h1>{title}</h1>
          <p className="gap-subtitle">{t('gapMap.subtitle', { count: gaps.length })}</p>
        </div>

        <div className="gap-controls">
          <div className="gap-jurisdiction">
            <span className="gap-jurisdiction-label">{t('gapMap.jurisdictionLabel')}</span>
            <span className="gap-jurisdiction-value">{t('gapMap.jurisdictionValue')}</span>
          </div>
          <label className="gap-window">
            <span className="visually-hidden">{t('gapMap.windowLabel')}</span>
            <select value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value) as WindowDays)}>
              {TIME_WINDOWS.map((option) => (
                <option key={option.days} value={option.days}>
                  {t(`gapMap.window.${option.days}`, { defaultValue: option.label })}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="section-body gap-body">
        <div className="gap-stats">
          <article className="gap-card">
            <span className="gap-card-label">{t('gapMap.cards.enrollmentLabel')}</span>
            <span className="gap-card-value">
              {enrollmentRate}
              <span className="gap-card-unit">%</span>
            </span>
            <span className="gap-card-delta is-up">{delta(totals.enrollmentDelta)}</span>
            <div className="gap-bar">
              <span style={{ width: `${enrollmentRate}%` }} />
            </div>
            <span className="gap-card-foot">
              {t('gapMap.cards.enrollmentFoot', {
                enrolled: formatNumber(totals.enrolled),
                callers: formatNumber(totals.callers),
              })}
            </span>
          </article>

          <article className="gap-card">
            <span className="gap-card-label">{t('gapMap.cards.completionLabel')}</span>
            <span className="gap-card-value">
              {completionRate}
              <span className="gap-card-unit">%</span>
            </span>
            <span className={`gap-card-delta ${totals.completionDelta >= 0 ? 'is-up' : 'is-down'}`}>
              {delta(totals.completionDelta)}
            </span>
            <div className="gap-bar">
              <span style={{ width: `${completionRate}%` }} />
            </div>
            <span className="gap-card-foot">
              {t('gapMap.cards.completionFoot', { completed: formatNumber(totals.completed) })}
            </span>
          </article>

          <article className="gap-card is-alert">
            <span className="gap-card-label">{t('gapMap.cards.placementLabel')}</span>
            <span className="gap-card-value">
              {placementRate}
              <span className="gap-card-unit">%</span>
            </span>
            <span className={`gap-card-delta ${totals.placementDelta >= 0 ? 'is-up' : 'is-down'}`}>
              {delta(totals.placementDelta)}
            </span>
            <div className="gap-bar is-alert">
              <span style={{ width: `${placementRate}%` }} />
            </div>
            <span className="gap-card-foot">
              {placementRate < PLACEMENT_TARGET
                ? t('gapMap.cards.placementBelow', { target: PLACEMENT_TARGET })
                : t('gapMap.cards.placementAbove', { target: PLACEMENT_TARGET })}
            </span>
          </article>

          <article className="gap-card is-alert">
            <span className="gap-card-label">{t('gapMap.cards.unplacedLabel')}</span>
            <span className="gap-card-value is-alert">{formatNumber(unplaced)}</span>
            <span className="gap-card-delta">{t('gapMap.cards.unplacedDelta')}</span>
            <div className="gap-bar is-alert">
              <span style={{ width: `${percent(unplaced, totals.completed)}%` }} />
            </div>
            <span className="gap-card-foot">
              {t('gapMap.cards.unplacedFoot', { count: unplacedBlocks.length })}
            </span>
          </article>

          <article className="gap-card">
            <span className="gap-card-label">{t('gapMap.cards.demandLabel')}</span>
            <div className="gap-demand-list">
              {demandByCourse.slice(0, 4).map((entry) => (
                <div className="gap-demand-row" key={entry.course}>
                  <span className="gap-demand-course">{entry.course}</span>
                  <span className="gap-demand-bar">
                    <span style={{ width: `${Math.round((entry.people / topDemand) * 100)}%` }} />
                  </span>
                  <span className="gap-demand-count">{formatNumber(entry.people)}</span>
                </div>
              ))}
            </div>
            <span className="gap-card-foot">
              {t('gapMap.cards.demandFoot', {
                shown: Math.min(4, demandByCourse.length),
                total: demandByCourse.length,
              })}
            </span>
          </article>

          <article className="gap-card is-warn">
            <span className="gap-card-label">{t('gapMap.cards.dialectLabel')}</span>
            <span className="gap-card-value">{dialectGaps.length}</span>
            <span className="gap-card-delta">{t('gapMap.cards.dialectDelta', { threshold: DIALECT_THRESHOLD })}</span>
            <div className="gap-dialect-list">
              {dialectGaps.slice(0, 3).map((entry) => (
                <div className="gap-dialect-row" key={entry.dialect}>
                  <span>{entry.dialect}</span>
                  <span className={entry.accuracy < 70 ? 'is-alert' : 'is-warn'}>{entry.accuracy}%</span>
                </div>
              ))}
            </div>
            <span className="gap-card-foot">{t('detection.dialectFoot')}</span>
          </article>
        </div>

        {notice && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">
              {notice.action === 'proposal' ? t('gapMap.actions.raiseProposal') : t('gapMap.actions.assignOfficer')}
            </span>
            <span>{t('gapMap.notice', { block: notice.gap.block, district: notice.gap.district })}</span>
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div className="gap-layout">
          <section className="gap-map-panel" aria-label={t('gapMap.legend.mapAria')}>
            <div className="gap-legend">
              <span className="gap-legend-title">{t('gapMap.legend.title')}</span>
              <span className="gap-legend-item">
                <span className="gap-swatch is-demand" aria-hidden="true" />
                {t('gapMap.legend.demand', { count: demandBlocks.length })}
              </span>
              <span className="gap-legend-item">
                <span className="gap-swatch is-unplaced" aria-hidden="true" />
                {t('gapMap.legend.unplaced', { count: unplacedBlocks.length })}
              </span>
              <span className="gap-legend-note">{t('gapMap.legend.note')}</span>
            </div>

            <GapMap gaps={gaps} focus={focus} onAction={(gap, action) => setNotice({ gap, action })} />
          </section>

          <aside className="gap-priority" aria-label={t('gapMap.priority.title')}>
            <div className="gap-priority-head">
              <span className="gap-priority-title">{t('gapMap.priority.title')}</span>
              <span className="gap-priority-count">
                {t('gapMap.priority.count', { total: gaps.length, shown: priorityGaps.length })}
              </span>
            </div>

            <ul className="gap-priority-list">
              {priorityGaps.map((gap) => (
                <li key={gap.gapId}>
                  <button
                    type="button"
                    className="gap-priority-item"
                    onClick={() => setFocus({ gapId: gap.gapId, nonce: Date.now() })}
                  >
                    <span className={`gap-swatch ${gap.gapType === 'no-centre' ? 'is-demand' : 'is-unplaced'}`} aria-hidden="true" />
                    <span className="gap-priority-text">
                      <span className="gap-priority-block">
                        {gap.block} · {gap.district}
                      </span>
                      <span className="gap-priority-detail">
                        {gap.gapType === 'no-centre'
                          ? t('gapMap.priority.demandLine', { count: gap.demandCount, course: gap.course })
                          : t('gapMap.priority.unplacedLine', { count: gap.unplacedCount, course: gap.course })}
                      </span>
                      <span className="gap-priority-meta">
                        {gap.gapType === 'no-centre'
                          ? t('gapMap.priority.metaDemand', { km: gap.nearestCentreKm })
                          : t('gapMap.priority.metaUnplaced', { placed: gap.placedCount, trained: gap.trainedCount })}{' '}
                        · {t('gapMap.priority.flaggedDaysAgo', { days: gap.flaggedDaysAgo })}
                      </span>
                    </span>
                    <span className={`gap-priority-badge is-${gap.severity}`}>{SEVERITY_BADGE[gap.severity]}</span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="gap-priority-foot">{t('gapMap.priority.foot')}</p>
          </aside>
        </div>
      </div>
    </>
  )
}
