import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STATUS_TONE, type BeneficiaryStatus } from '../../data/jharkhandBeneficiaries'
import {
  FLAG_REASONS,
  RESOURCE_PERSON,
  TRAINEE_STAGES,
  type FlagReason,
  type Trainee,
} from '../../data/resourcePerson'
import { formatLastContact } from '../../i18n/format'
import { TraineePanel } from './TraineePanel'
import { useTrainer } from './TrainerContext'
import '../../styles/resource-person.css'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** The trainer's own trainees: attendance when a session is open, status stages, flags. */
export function TraineesSection() {
  const { t } = useTranslation()
  const { trainees, batches, openSession, nextSession, markFor, mark, attendanceOf, flagTrainee, flags } = useTrainer()
  const [search, setSearch] = useState('')
  const [batchId, setBatchId] = useState('all')
  const [status, setStatus] = useState<BeneficiaryStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flagFor, setFlagFor] = useState<Trainee | null>(null)
  const [flagReason, setFlagReason] = useState<FlagReason>('repeated-absence')
  const [flagNote, setFlagNote] = useState('')
  const [flagError, setFlagError] = useState<string | null>(null)

  const title = t('sections.resourcePerson.beneficiaries.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return trainees.filter(
      (trainee) =>
        (!needle ||
          trainee.name.toLowerCase().includes(needle) ||
          trainee.beneficiaryId.toLowerCase().includes(needle) ||
          trainee.village.toLowerCase().includes(needle)) &&
        (batchId === 'all' || trainee.batchId === batchId) &&
        (status === 'all' || trainee.status === status),
    )
  }, [batchId, search, status, trainees])

  const selected = selectedId ? (trainees.find((trainee) => trainee.beneficiaryId === selectedId) ?? null) : null

  const submitFlag = () => {
    if (!flagFor) return
    if (flagNote.trim().length < 10) {
      setFlagError(t('resourcePerson.trainees.flagNoteRequired'))
      return
    }
    flagTrainee(flagFor.beneficiaryId, flagReason, flagNote.trim())
    setFlagFor(null)
    setFlagNote('')
    setFlagError(null)
  }

  return (
    <>
      <header className="section-header rp-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('resourcePerson.trainees.subtitle', { count: trainees.length, batches: batches.length })}
          </p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('resourcePerson.centreLabel')}</span>
          <span className="call-scope-value">
            {RESOURCE_PERSON.name} · {batches[0]?.centre}
          </span>
        </div>
      </header>

      <div className="section-body rp-body">
        <div className={openSession ? 'rp-session is-open' : 'rp-session'} role="status">
          <span className="rp-session-dot" aria-hidden="true" />
          {openSession ? (
            <span>
              {t('resourcePerson.attendance.open', {
                course: openSession.course,
                from: openSession.startTime,
                to: openSession.endTime,
              })}
            </span>
          ) : nextSession ? (
            <span>
              {t('resourcePerson.attendance.closed', {
                day: t(`resourcePerson.days.${DAY_KEYS[nextSession.window.dayIndex]}`),
                from: nextSession.window.startTime,
                course: nextSession.window.course,
              })}
            </span>
          ) : (
            <span>{t('resourcePerson.attendance.noSessions')}</span>
          )}
        </div>

        {flags.length > 0 && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">{t('resourcePerson.trainees.flagsRaised')}</span>
            <span>
              {t('resourcePerson.trainees.flagsRaisedLine', {
                count: flags.length,
                name: flags[0]!.name,
                reason: t(`resourcePerson.flagReason.${flags[0]!.reason}`),
              })}
            </span>
          </div>
        )}

        <div className="call-filters">
          <label className="call-search">
            <span className="visually-hidden">{t('resourcePerson.trainees.searchLabel')}</span>
            <input
              type="search"
              value={search}
              placeholder={t('resourcePerson.trainees.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="call-select">
            <span className="visually-hidden">{t('resourcePerson.trainees.batchLabel')}</span>
            <select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              <option value="all">{t('resourcePerson.trainees.batchAll')}</option>
              {batches.map((batch) => (
                <option key={batch.batchId} value={batch.batchId}>
                  {batch.batchId} · {batch.course}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={status === 'all' ? 'call-chip is-selected' : 'call-chip'}
            onClick={() => setStatus('all')}
          >
            {t('common.all')} · {trainees.length}
          </button>
          {TRAINEE_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              className={status === stage ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setStatus(status === stage ? 'all' : stage)}
            >
              {t(`status.${stage}`)} · {trainees.filter((trainee) => trainee.status === stage).length}
            </button>
          ))}
        </div>

        <div className={selected ? 'rp-layout has-panel' : 'rp-layout'}>
          <section className="rp-table-panel" aria-label={t('resourcePerson.trainees.listAria')}>
            <div className="rp-table-head" aria-hidden="true">
              <span>{t('beneficiaries.headers.name')}</span>
              <span>{t('resourcePerson.trainees.headers.batch')}</span>
              <span>{t('resourcePerson.trainees.headers.attendance')}</span>
              <span>{t('beneficiaries.headers.status')}</span>
              <span>{t('resourcePerson.trainees.headers.today')}</span>
              <span />
            </div>

            {visible.length === 0 ? (
              <p className="call-empty">{t('resourcePerson.trainees.empty')}</p>
            ) : (
              <ul className="rp-rows">
                {visible.map((trainee) => {
                  const attendance = attendanceOf(trainee)
                  const marked = markFor(trainee.beneficiaryId)
                  const openForThisBatch = openSession?.batchId === trainee.batchId
                  return (
                    <li
                      className={selectedId === trainee.beneficiaryId ? 'rp-row is-selected' : 'rp-row'}
                      key={trainee.beneficiaryId}
                    >
                      <button
                        type="button"
                        className="rp-row-main"
                        onClick={() =>
                          setSelectedId(selectedId === trainee.beneficiaryId ? null : trainee.beneficiaryId)
                        }
                      >
                        <span className="ben-cell-name">
                          <span className="ben-name">{trainee.name}</span>
                          <span className="ben-id">
                            {trainee.beneficiaryId} · {trainee.village}
                          </span>
                        </span>
                        <span className="ben-cell">
                          {trainee.batchId}
                          <span className="rp-cell-sub">{trainee.course}</span>
                        </span>
                        <span className="ben-cell">
                          {attendance.attended} / {attendance.total}
                          <span className="rp-cell-sub">{formatLastContact(t, trainee.lastContactDays)}</span>
                        </span>
                        <span className="ben-cell">
                          <span className={`chip is-${STATUS_TONE[trainee.status]}`}>
                            {t(`status.${trainee.status}`)}
                          </span>
                        </span>
                      </button>

                      <span className="rp-attendance">
                        {openForThisBatch ? (
                          <>
                            <button
                              type="button"
                              className={marked === 'present' ? 'rp-mark is-present' : 'rp-mark'}
                              onClick={() => mark(trainee.beneficiaryId, 'present')}
                            >
                              {t('beneficiaries.journey.present')}
                            </button>
                            <button
                              type="button"
                              className={marked === 'absent' ? 'rp-mark is-absent' : 'rp-mark'}
                              onClick={() => mark(trainee.beneficiaryId, 'absent')}
                            >
                              {t('beneficiaries.journey.absent')}
                            </button>
                          </>
                        ) : (
                          <span className="rp-locked">{t('resourcePerson.attendance.locked')}</span>
                        )}
                      </span>

                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => {
                          setFlagFor(trainee)
                          setFlagNote('')
                          setFlagError(null)
                        }}
                      >
                        {t('resourcePerson.trainees.flag')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="call-queue-foot">
              <span>{t('common.showing', { from: 1, to: visible.length, total: trainees.length })}</span>
              <span className="call-queue-ticking">{t('resourcePerson.trainees.foot')}</span>
            </div>
          </section>

          {selected && (
            <TraineePanel
              trainee={selected}
              onClose={() => setSelectedId(null)}
              onFlag={() => {
                setFlagFor(selected)
                setFlagNote('')
                setFlagError(null)
              }}
            />
          )}
        </div>
      </div>

      {flagFor && (
        <div className="rp-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('resourcePerson.trainees.flagTitle')}>
          <div className="rp-modal">
            <header className="rp-modal-head">
              <div>
                <span className="journey-eyebrow">{t('resourcePerson.trainees.flagTitle')}</span>
                <h2>{flagFor.name}</h2>
              </div>
              <button type="button" className="journey-close" onClick={() => setFlagFor(null)} aria-label={t('common.close')}>
                ✕
              </button>
            </header>

            <div className="rp-modal-body">
              <p className="rp-hint">{t('resourcePerson.trainees.flagHint')}</p>
              <label className="call-field">
                <span>{t('resourcePerson.trainees.flagReason')}</span>
                <select value={flagReason} onChange={(event) => setFlagReason(event.target.value as FlagReason)}>
                  {FLAG_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {t(`resourcePerson.flagReason.${reason}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="call-field">
                <span>{t('resourcePerson.trainees.flagNote')}</span>
                <textarea
                  rows={3}
                  value={flagNote}
                  placeholder={t('resourcePerson.trainees.flagNotePlaceholder')}
                  onChange={(event) => setFlagNote(event.target.value)}
                />
              </label>
              {flagError && (
                <p className="rp-error" role="alert">
                  {flagError}
                </p>
              )}
            </div>

            <footer className="rp-modal-foot">
              <button type="button" className="btn btn-outline btn-small" onClick={() => setFlagFor(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={submitFlag}>
                {t('resourcePerson.trainees.flagSend')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
