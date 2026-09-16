import { useEffect, useMemo, useState } from 'react'
import {
  courseDemand,
  DEFAULT_WINDOW,
  DIALECT_ACCURACY,
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

const ACTION_LABEL: Record<GapAction, string> = { proposal: 'Raise proposal', officer: 'Assign officer' }

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

function deltaText(points: number): string {
  return `${points >= 0 ? '▲' : '▼'} ${Math.abs(points).toFixed(1)} pts vs previous period`
}

export function GapMapSection() {
  const [windowDays, setWindowDays] = useState<WindowDays>(DEFAULT_WINDOW)
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [notice, setNotice] = useState<{ gap: BlockGap; action: GapAction } | null>(null)

  useEffect(() => {
    document.title = 'Opportunity Gap Map · SETU'
  }, [])

  const gaps = useMemo(() => gapsInWindow(windowDays), [windowDays])
  const totals = statewideTotals(windowDays)
  const demandByCourse = useMemo(() => courseDemand(gaps), [gaps])

  const enrollmentRate = percent(totals.enrolled, totals.callers)
  const completionRate = percent(totals.completed, totals.enrolled)
  const placementRate = percent(totals.placed, totals.completed)
  const unplaced = totals.completed - totals.placed

  const demandBlocks = gaps.filter((gap) => gap.gapType === 'no-centre')
  const unplacedBlocks = gaps.filter((gap) => gap.gapType === 'no-local-jobs')
  const dialectGaps = DIALECT_ACCURACY.filter((entry) => entry.accuracy < DIALECT_THRESHOLD)
  const topDemand = demandByCourse[0]?.people ?? 1
  const priorityGaps = gaps.slice(0, 6)

  return (
    <>
      <header className="section-header gap-header">
        <div>
          <h1>Opportunity Gap Map</h1>
          <p className="gap-subtitle">
            Block-level demand and placement gaps · {gaps.length} blocks flagged in this window
          </p>
        </div>

        <div className="gap-controls">
          <div className="gap-jurisdiction">
            <span className="gap-jurisdiction-label">Jurisdiction</span>
            <span className="gap-jurisdiction-value">Jharkhand · all 24 districts</span>
          </div>
          <label className="gap-window">
            <span className="visually-hidden">Time window</span>
            <select value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value) as WindowDays)}>
              {TIME_WINDOWS.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="section-body gap-body">
        <div className="gap-stats">
          <article className="gap-card">
            <span className="gap-card-label">Enrollment rate</span>
            <span className="gap-card-value">
              {enrollmentRate}
              <span className="gap-card-unit">%</span>
            </span>
            <span className="gap-card-delta is-up">{deltaText(totals.enrollmentDelta)}</span>
            <div className="gap-bar">
              <span style={{ width: `${enrollmentRate}%` }} />
            </div>
            <span className="gap-card-foot">
              {formatNumber(totals.enrolled)} of {formatNumber(totals.callers)} callers enrolled
            </span>
          </article>

          <article className="gap-card">
            <span className="gap-card-label">Completion rate</span>
            <span className="gap-card-value">
              {completionRate}
              <span className="gap-card-unit">%</span>
            </span>
            <span className={`gap-card-delta ${totals.completionDelta >= 0 ? 'is-up' : 'is-down'}`}>
              {deltaText(totals.completionDelta)}
            </span>
            <div className="gap-bar">
              <span style={{ width: `${completionRate}%` }} />
            </div>
            <span className="gap-card-foot">{formatNumber(totals.completed)} finished their course</span>
          </article>

          <article className="gap-card is-alert">
            <span className="gap-card-label">Placement rate</span>
            <span className="gap-card-value">
              {placementRate}
              <span className="gap-card-unit">%</span>
            </span>
            <span className={`gap-card-delta ${totals.placementDelta >= 0 ? 'is-up' : 'is-down'}`}>
              {deltaText(totals.placementDelta)}
            </span>
            <div className="gap-bar is-alert">
              <span style={{ width: `${placementRate}%` }} />
            </div>
            <span className="gap-card-foot">
              {placementRate < PLACEMENT_TARGET
                ? `Below the ${PLACEMENT_TARGET}% state target`
                : `At or above the ${PLACEMENT_TARGET}% state target`}
            </span>
          </article>

          <article className="gap-card is-alert">
            <span className="gap-card-label">Trained, unplaced</span>
            <span className="gap-card-value is-alert">{formatNumber(unplaced)}</span>
            <span className="gap-card-delta">Completed minus placed, statewide</span>
            <div className="gap-bar is-alert">
              <span style={{ width: `${percent(unplaced, totals.completed)}%` }} />
            </div>
            <span className="gap-card-foot">{unplacedBlocks.length} blocks flagged with no local jobs</span>
          </article>

          <article className="gap-card">
            <span className="gap-card-label">Course demand</span>
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
              Top {Math.min(4, demandByCourse.length)} of {demandByCourse.length} trades requested in flagged blocks
            </span>
          </article>

          <article className="gap-card is-warn">
            <span className="gap-card-label">Dialect gaps</span>
            <span className="gap-card-value">{dialectGaps.length}</span>
            <span className="gap-card-delta">Below {DIALECT_THRESHOLD}% voice accuracy</span>
            <div className="gap-dialect-list">
              {dialectGaps.slice(0, 3).map((entry) => (
                <div className="gap-dialect-row" key={entry.dialect}>
                  <span>{entry.dialect}</span>
                  <span className={entry.accuracy < 70 ? 'is-alert' : 'is-warn'}>{entry.accuracy}%</span>
                </div>
              ))}
            </div>
            <span className="gap-card-foot">Rolling 12 months, not affected by the window</span>
          </article>
        </div>

        {notice && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">{ACTION_LABEL[notice.action]}</span>
            <span>
              {notice.gap.block} · {notice.gap.district} — recorded in this session only. The sanction and assignment
              workflow arrives with the Admin Flags section.
            </span>
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="gap-layout">
          <section className="gap-map-panel" aria-label="Block-level gap map">
            <div className="gap-legend">
              <span className="gap-legend-title">Block-level gap map</span>
              <span className="gap-legend-item">
                <span className="gap-swatch is-demand" aria-hidden="true" />
                Demand, no centre · {demandBlocks.length}
              </span>
              <span className="gap-legend-item">
                <span className="gap-swatch is-unplaced" aria-hidden="true" />
                Trained, no local jobs · {unplacedBlocks.length}
              </span>
              <span className="gap-legend-note">Marker size = people affected · click a marker for actions</span>
            </div>

            <GapMap gaps={gaps} focus={focus} onAction={(gap, action) => setNotice({ gap, action })} />
          </section>

          <aside className="gap-priority" aria-label="Priority gaps">
            <div className="gap-priority-head">
              <span className="gap-priority-title">Priority gaps</span>
              <span className="gap-priority-count">
                {gaps.length} flagged · top {priorityGaps.length}
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
                          ? `${gap.demandCount} want ${gap.course} · no centre in block`
                          : `${gap.unplacedCount} trained in ${gap.course} · no local jobs`}
                      </span>
                      <span className="gap-priority-meta">
                        {gap.gapType === 'no-centre'
                          ? `Nearest centre ${gap.nearestCentreKm} km`
                          : `${gap.placedCount} of ${gap.trainedCount} placed`}{' '}
                        · flagged {gap.flaggedDaysAgo} days ago
                      </span>
                    </span>
                    <span className={`gap-priority-badge is-${gap.severity}`}>{SEVERITY_BADGE[gap.severity]}</span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="gap-priority-foot">Select a block to centre the map on it and open its actions.</p>
          </aside>
        </div>
      </div>
    </>
  )
}
