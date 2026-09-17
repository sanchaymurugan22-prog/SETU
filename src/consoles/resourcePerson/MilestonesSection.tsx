import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STATUS_TONE } from '../../data/jharkhandBeneficiaries'
import { RESOURCE_PERSON } from '../../data/resourcePerson'
import { formatLastContact } from '../../i18n/format'
import { useTrainer } from './TrainerContext'
import '../../styles/resource-person.css'

/** Trainees this person took all the way to completion, with the record behind each one. */
export function MilestonesSection() {
  const { t } = useTranslation()
  const { trainees, batches, attendanceOf } = useTrainer()
  const [openId, setOpenId] = useState<string | null>(null)

  const title = t('sections.resourcePerson.milestones.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const finished = useMemo(
    () =>
      trainees.filter(
        (trainee) =>
          trainee.status === 'completed' ||
          trainee.status === 'certified' ||
          trainee.status === 'placed' ||
          trainee.status === 'trained-unplaced',
      ),
    [trainees],
  )

  const certified = finished.filter((trainee) => trainee.certificateId !== null).length
  const placed = finished.filter((trainee) => trainee.status === 'placed').length
  const awaitingWork = finished.filter((trainee) => trainee.status === 'trained-unplaced').length

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
      </header>

      <div className="section-body rp-body">
        <div className="rp-milestone-stats">
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.milestones.completedLabel')}</span>
            <span className="gap-card-value">{finished.length}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.completedFoot')}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.milestones.certifiedLabel')}</span>
            <span className="gap-card-value">{certified}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.certifiedFoot')}</span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('resourcePerson.milestones.placedLabel')}</span>
            <span className="gap-card-value">{placed}</span>
            <span className="gap-card-foot">{t('resourcePerson.milestones.placedFoot')}</span>
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
                        <span className={`chip is-${STATUS_TONE[trainee.status]}`}>{t(`status.${trainee.status}`)}</span>
                      </span>
                      <span className="ben-cell is-muted">
                        {trainee.certificateId ?? t('resourcePerson.milestones.noCertificate')}
                      </span>
                    </button>

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
                                  <span className="timeline-title">{t(`status.${entry.status}`)}</span>
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
    </>
  )
}
