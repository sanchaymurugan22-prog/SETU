import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EMPLOYMENT_TONE, TRAINING_TONE } from '../../data/jharkhandBeneficiaries'
import { RESOURCE_PERSON, type Trainee } from '../../data/resourcePerson'
import { WriteError } from '../admin/WriteError'
import { CertificateSheet } from './CertificateSheet'
import { formatLastContact } from '../../i18n/format'
import { useTrainer } from './TrainerContext'
import { useDataSource } from '../../data/useDataSource'
import { SourceBadge } from '../admin/SourceBadge'
import '../../styles/resource-person.css'

/** Trainees this person took all the way to completion, with the record behind each one. */
export function MilestonesSection() {
  const { t } = useTranslation()
  const source = useDataSource('beneficiaries')
  const { trainees, batches, attendanceOf, issueCertificate, writeError, writePending, clearWriteError } =
    useTrainer()
  const [openId, setOpenId] = useState<string | null>(null)
  const [certificateFor, setCertificateFor] = useState<Trainee | null>(null)

  const title = t('sections.resourcePerson.milestones.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  // Certified is the end of training: there is no separate completed stage to include.
  const finished = useMemo(() => trainees.filter((trainee) => trainee.trainingStatus === 'certified'), [trainees])

  const placed = finished.filter((trainee) => trainee.employmentStatus === 'placed').length
  const seeking = finished.filter((trainee) => trainee.employmentStatus === 'seeking').length
  // Certified and unplaced at once — the pair the Gap Map counts as trained-but-unplaced.
  const awaitingWork = finished.filter((trainee) => trainee.employmentStatus === 'unplaced').length

  return (
    <>
      <header className="section-header rp-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('resourcePerson.milestones.subtitle', { count: finished.length, total: trainees.length })}
          </p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('resourcePerson.centreLabel')}</span>
          <span className="call-scope-value">
            {RESOURCE_PERSON.name} · {batches[0]?.centre}
          </span>
        </div>
          <SourceBadge state={source} count={finished.length} />
      </header>

      <div className="section-body rp-body">
        <WriteError error={writeError} onDismiss={clearWriteError} />

        <div className="rp-milestone-stats">
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.milestones.certifiedLabel')}</span>
            <span className="gap-card-value">{finished.length}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.certifiedFoot')}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.milestones.placedLabel')}</span>
            <span className="gap-card-value">{placed}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.placedFoot')}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.milestones.seekingLabel')}</span>
            <span className="gap-card-value">{seeking}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.seekingFoot')}</span>
          </article>
          <article className="gap-card is-alert">
            <span className="gap-card-label">{t('resourcePerson.milestones.awaitingLabel')}</span>
            <span className="gap-card-value is-alert">{awaitingWork}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.awaitingFoot')}</span>
          </article>
        </div>

        <div className="rp-table-panel">
          {finished.length === 0 ? (
            <p className="call-empty">{t('resourcePerson.milestones.empty')}</p>
          ) : (
            <ul className="rp-milestone-list">
              {finished.map((trainee) => {
                const attendance = attendanceOf(trainee)
                const open = openId === trainee.beneficiaryId
                return (
                  <li className={open ? 'rp-milestone is-open' : 'rp-milestone'} key={trainee.beneficiaryId}>
                    <button
                      type="button"
                      className="rp-milestone-head"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : trainee.beneficiaryId)}
                    >
                      <span className="ben-cell-name">
                        <span className="ben-name">{trainee.name}</span>
                        <span className="ben-id">
                          {trainee.beneficiaryId} · {trainee.village}
                        </span>
                      </span>
                      <span className="ben-cell">
                        {trainee.course}
                        <span className="rp-cell-sub">{trainee.batchId}</span>
                      </span>
                      <span className="ben-cell">
                        {attendance.attended} / {attendance.total}
                        <span className="rp-cell-sub">{t('resourcePerson.milestones.attendanceSub')}</span>
                      </span>
                      <span className="ben-cell">
                        <span className={`chip is-${TRAINING_TONE[trainee.trainingStatus]}`}>
                          {t(`training.${trainee.trainingStatus}`)}
                        </span>
                      </span>
                      <span className="ben-cell">
                        <span className={`chip is-${EMPLOYMENT_TONE[trainee.employmentStatus]}`}>
                          {t(`employment.${trainee.employmentStatus}`)}
                        </span>
                      </span>
                      <span className="ben-cell is-muted">
                        {trainee.certificateId ?? t('resourcePerson.milestones.noCertificate')}
                      </span>
                    </button>

                    <div className="rp-milestone-actions">
                      {trainee.certificateId ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() => setCertificateFor(trainee)}
                        >
                          {t('certificate.viewAction')}
                        </button>
                      ) : (
                        // Certifying normally issues the certificate in the same write.
                        // This is for a record certified before that was true.
                        <button
                          type="button"
                          className="btn btn-primary btn-small"
                          disabled={writePending}
                          onClick={() => issueCertificate(trainee.beneficiaryId)}
                        >
                          {writePending ? t('writes.saving') : t('certificate.generateAction')}
                        </button>
                      )}
                    </div>

                    {open && (
                      <div className="rp-milestone-body">
                        <dl className="rp-reco">
                          <div>
                            <dt>{t('resourcePerson.trainees.nextCourse')}</dt>
                            <dd>{trainee.nextCourse ?? t('common.none')}</dd>
                          </div>
                          <div>
                            <dt>{t('resourcePerson.trainees.jobRecommendation')}</dt>
                            <dd>{trainee.jobRecommendation ?? t('common.none')}</dd>
                          </div>
                          <div>
                            <dt>{t('beneficiaries.journey.outcome.outcome')}</dt>
                            <dd>{trainee.outcome}</dd>
                          </div>
                          <div>
                            <dt>{t('beneficiaries.journey.facts.lastContact')}</dt>
                            <dd>{formatLastContact(t, trainee.lastContactDays)}</dd>
                          </div>
                        </dl>

                        <ol className="timeline">
                          {[...trainee.statusHistory].reverse().map((entry, index) => (
                            <li key={`${entry.status}-${index}`} className="timeline-item is-neutral">
                              <span className="timeline-dot" aria-hidden="true" />
                              <div className="timeline-content">
                                <div className="timeline-title-row">
                                  <span className="timeline-title">{t(`training.${entry.status}`)}</span>
                                  <span className="timeline-when">{entry.whenLabel}</span>
                                </div>
                                <span className="timeline-detail">{entry.description}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="call-queue-foot">
            <span>{t('resourcePerson.milestones.foot')}</span>
          </div>
        </div>
      </div>

      {certificateFor && (
        <div className="certificate-overlay" role="dialog" aria-modal="true" aria-label={t('certificate.title')}>
          <div className="certificate-actions">
            <span className="certificate-actions-title">{t('certificate.title')}</span>
            <span className="rp-cell-sub">
              {certificateFor.name} · {certificateFor.certificateId}
            </span>
            <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()}>
              {t('certificate.printAction')}
            </button>
            <button type="button" className="btn btn-outline btn-small" onClick={() => setCertificateFor(null)}>
              {t('common.close')}
            </button>
          </div>

          <CertificateSheet trainee={certificateFor} />
        </div>
      )}
    </>
  )
}
