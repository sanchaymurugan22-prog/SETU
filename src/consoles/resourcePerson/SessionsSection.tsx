import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ATTENDANCE_WATCH_PERCENT, useTrainer } from './TrainerContext'
import { useDataSource } from '../../data/useDataSource'
import { SourceBadge } from '../admin/SourceBadge'
import '../../styles/resource-person.css'
import { WriteError } from '../admin/WriteError'

/** Long date in the interface language. */
function formatDate(iso: string, language: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  } catch {
    return iso
  }
}

/**
 * Every session this trainer has taken, by date. Nothing here is stored separately: the
 * register is rebuilt from the same attendance marks the Beneficiaries section shows, so
 * the two cannot disagree.
 */
export function SessionsSection() {
  const { t, i18n } = useTranslation()
  const source = useDataSource('attendance')
  const { sessions, concerns, trainees, batches, writeError, clearWriteError } = useTrainer()
  const [batchId, setBatchId] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const title = t('sections.resourcePerson.sessions.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(
    () => (batchId === 'all' ? sessions : sessions.filter((session) => session.batchId === batchId)),
    [batchId, sessions],
  )

  const totals = useMemo(() => {
    const present = sessions.reduce((sum, session) => sum + session.present, 0)
    const marks = sessions.reduce((sum, session) => sum + session.present + session.absent, 0)
    return { present, marks, percent: marks === 0 ? 0 : Math.round((present / marks) * 100) }
  }, [sessions])

  const selected = openId ? (visible.find((session) => session.sessionId === openId) ?? null) : null

  return (
    <>
      <header className="section-header rp-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('resourcePerson.sessions.subtitle', { count: sessions.length, batches: batches.length })}
          </p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('resourcePerson.centreLabel')}</span>
          <span className="call-scope-value">{batches[0]?.centre}</span>
        </div>
          <SourceBadge state={source} count={sessions.length} />
      </header>

      <div className="section-body rp-body">
        <WriteError error={writeError} onDismiss={clearWriteError} />

        <div className="rp-milestone-stats">
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.sessions.cards.heldLabel')}</span>
            <span className="gap-card-value">{sessions.length}</span>
            <span className="gap-card-foot">{t('resourcePerson.sessions.cards.heldFoot', { batches: batches.length })}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.sessions.cards.traineesLabel')}</span>
            <span className="gap-card-value">{trainees.length}</span>
            <span className="gap-card-foot">{t('resourcePerson.sessions.cards.traineesFoot')}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.sessions.cards.attendanceLabel')}</span>
            <span className="gap-card-value">
              {totals.percent}
              <span className="gap-card-unit">%</span>
            </span>
            <div className="gap-bar">
              <span style={{ width: `${totals.percent}%` }} />
            </div>
            <span className="gap-card-foot">
              {t('resourcePerson.sessions.cards.attendanceFoot', { present: totals.present, marks: totals.marks })}
            </span>
          </article>
          <article className={concerns.length > 0 ? 'gap-card is-alert' : 'gap-card'}>
            <span className="gap-card-label">{t('resourcePerson.sessions.cards.fallingLabel')}</span>
            <span className={concerns.length > 0 ? 'gap-card-value is-alert' : 'gap-card-value'}>
              {concerns.length}
            </span>
            <div className="gap-dialect-list">
              {concerns.slice(0, 3).map((concern) => (
                <div className="gap-dialect-row" key={concern.trainee.beneficiaryId}>
                  <span>{concern.trainee.name}</span>
                  <span className="is-alert">{concern.percent}%</span>
                </div>
              ))}
            </div>
            <span className="gap-card-foot">
              {concerns.length === 0
                ? t('resourcePerson.sessions.cards.fallingNone')
                : t('resourcePerson.sessions.cards.fallingFoot', { threshold: ATTENDANCE_WATCH_PERCENT })}
            </span>
          </article>
        </div>

        <div className="call-filters">
          <span className="call-filter-label">{t('resourcePerson.trainees.batchLabel')}</span>
          <button
            type="button"
            className={batchId === 'all' ? 'call-chip is-selected' : 'call-chip'}
            onClick={() => setBatchId('all')}
          >
            {t('common.all')} · {sessions.length}
          </button>
          {batches.map((batch) => (
            <button
              key={batch.batchId}
              type="button"
              className={batchId === batch.batchId ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setBatchId(batchId === batch.batchId ? 'all' : batch.batchId)}
            >
              {batch.batchId} · {sessions.filter((session) => session.batchId === batch.batchId).length}
            </button>
          ))}
        </div>

        <div className={selected ? 'rp-layout has-panel' : 'rp-layout'}>
          <section className="rp-table-panel" aria-label={t('resourcePerson.sessions.listAria')}>
            <div className="rp-session-head" aria-hidden="true">
              <span>{t('resourcePerson.sessions.headers.date')}</span>
              <span>{t('resourcePerson.sessions.headers.batch')}</span>
              <span>{t('resourcePerson.sessions.headers.present')}</span>
              <span>{t('resourcePerson.sessions.headers.absent')}</span>
              <span>{t('resourcePerson.sessions.headers.attendance')}</span>
            </div>

            {visible.length === 0 ? (
              <p className="call-empty">{t('resourcePerson.sessions.empty')}</p>
            ) : (
              <ul className="rp-rows">
                {visible.map((session) => (
                  <li key={session.sessionId}>
                    <button
                      type="button"
                      className={
                        openId === session.sessionId ? 'rp-session-row is-selected' : 'rp-session-row'
                      }
                      onClick={() => setOpenId(openId === session.sessionId ? null : session.sessionId)}
                    >
                      <span className="ben-cell-name">
                        <span className="ben-name">{formatDate(session.dateIso, i18n.language)}</span>
                        <span className="ben-id">
                          {session.startTime}–{session.endTime}
                          {session.live && (
                            <span className="chip is-cyan rp-live-chip">{t('resourcePerson.sessions.live')}</span>
                          )}
                        </span>
                      </span>
                      <span className="ben-cell">
                        {session.batchId}
                        <span className="rp-cell-sub">
                          {session.course} · {t('resourcePerson.sessions.number', { number: session.number })}
                        </span>
                      </span>
                      <span className="ben-cell">{session.present}</span>
                      <span className="ben-cell">{session.absent}</span>
                      <span className="ben-cell">
                        <span className={session.attendancePercent < ATTENDANCE_WATCH_PERCENT ? 'is-alert' : ''}>
                          {session.attendancePercent}%
                        </span>
                        <span className="gap-bar admin-fill">
                          <span style={{ width: `${session.attendancePercent}%` }} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="call-queue-foot">
              <span>{t('common.showing', { from: 1, to: visible.length, total: sessions.length })}</span>
              <span className="call-queue-ticking">{t('resourcePerson.sessions.foot')}</span>
            </div>
          </section>

          {selected && (
            <aside
              className="rp-panel"
              aria-label={t('resourcePerson.sessions.panelAria', { date: formatDate(selected.dateIso, i18n.language) })}
            >
              <div className="journey-head">
                <div>
                  <span className="journey-eyebrow">
                    {t('resourcePerson.sessions.number', { number: selected.number })}
                  </span>
                  <h2>{formatDate(selected.dateIso, i18n.language)}</h2>
                  <span className="journey-id">
                    {selected.startTime}–{selected.endTime} · {selected.batchId} · {selected.course}
                  </span>
                </div>
                <button
                  type="button"
                  className="journey-close"
                  onClick={() => setOpenId(null)}
                  aria-label={t('common.close')}
                >
                  ✕
                </button>
              </div>

              <div className="journey-summary">
                <div className="journey-chips">
                  <span className="chip is-teal">
                    {t('resourcePerson.sessions.presentCount', { count: selected.present })}
                  </span>
                  <span className="chip is-magenta">
                    {t('resourcePerson.sessions.absentCount', { count: selected.absent })}
                  </span>
                  <span className="chip is-neutral">{selected.attendancePercent}%</span>
                  {selected.live && <span className="chip is-cyan">{t('resourcePerson.sessions.live')}</span>}
                </div>
              </div>

              <section className="rp-history" aria-label={t('resourcePerson.sessions.registerTitle')}>
                <span className="rp-block-title">{t('resourcePerson.sessions.registerTitle')}</span>
                <ul className="rp-register">
                  {selected.entries.map((entry) => (
                    <li className="rp-register-row" key={entry.beneficiaryId}>
                      <span className="rp-register-name">
                        {entry.name}
                        <span className="rp-cell-sub">{entry.beneficiaryId}</span>
                      </span>
                      <span className={`rp-register-mark is-${entry.mark}`}>
                        {entry.mark === 'present'
                          ? t('beneficiaries.journey.present')
                          : t('beneficiaries.journey.absent')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          )}
        </div>
      </div>
    </>
  )
}
