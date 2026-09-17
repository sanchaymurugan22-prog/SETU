import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STATUS_TONE, type BeneficiaryStatus } from '../../data/jharkhandBeneficiaries'
import { formatLastContact } from '../../i18n/format'
import {
  JOB_OPTIONS,
  RESOURCE_PERSON,
  NEXT_COURSE_OPTIONS,
  STAGES_NEEDING_RECOMMENDATIONS,
  TRAINEE_STAGES,
  type Trainee,
} from '../../data/resourcePerson'
import { useTrainer } from './TrainerContext'

/** Full trainee record, the status form with its mandatory description, and the certificate. */
export function TraineePanel({
  trainee,
  onClose,
  onFlag,
}: {
  trainee: Trainee
  onClose: () => void
  onFlag: () => void
}) {
  const { t } = useTranslation()
  const { attendanceOf, updateStatus } = useTrainer()
  const [status, setStatus] = useState<BeneficiaryStatus>(trainee.status)
  const [description, setDescription] = useState('')
  const [nextCourse, setNextCourse] = useState(trainee.nextCourse ?? NEXT_COURSE_OPTIONS[0]!)
  const [job, setJob] = useState(trainee.jobRecommendation ?? JOB_OPTIONS[0]!)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const attendance = attendanceOf(trainee)
  const needsRecommendations = STAGES_NEEDING_RECOMMENDATIONS.includes(status)

  const save = () => {
    if (description.trim().length < 10) {
      setError(t('resourcePerson.trainees.descriptionRequired'))
      return
    }
    setError(null)
    updateStatus(trainee.beneficiaryId, {
      status,
      description: description.trim(),
      ...(needsRecommendations ? { nextCourse, jobRecommendation: job } : {}),
    })
    setSaved(
      needsRecommendations
        ? t('resourcePerson.trainees.savedWithCertificate', { status: t(`status.${status}`) })
        : t('resourcePerson.trainees.saved', { status: t(`status.${status}`) }),
    )
    setDescription('')
  }

  return (
    <aside className="rp-panel" aria-label={t('resourcePerson.trainees.panelAria', { name: trainee.name })}>
      <div className="journey-head">
        <div>
          <span className="journey-eyebrow">{t('resourcePerson.trainees.panelEyebrow')}</span>
          <h2>{trainee.name}</h2>
          <span className="journey-id">
            {trainee.beneficiaryId} · {trainee.age} {trainee.gender} · {trainee.preferredLanguage}
          </span>
        </div>
        <button type="button" className="journey-close" onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>
      </div>

      <div className="journey-summary">
        <div className="journey-chips">
          <span className={`chip is-${STATUS_TONE[trainee.status]}`}>{t(`status.${trainee.status}`)}</span>
          <span className="chip is-neutral">{trainee.batchId}</span>
          {trainee.certificateId && <span className="chip is-teal">{trainee.certificateId}</span>}
        </div>

        <dl className="journey-facts">
          <div>
            <dt>{t('resourcePerson.trainees.facts.course')}</dt>
            <dd>{trainee.course}</dd>
          </div>
          <div>
            <dt>{t('resourcePerson.trainees.facts.attendance')}</dt>
            <dd>
              {attendance.attended} / {attendance.total}
            </dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.location')}</dt>
            <dd>
              {trainee.block} · {trainee.village}
            </dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.primaryPhone')}</dt>
            <dd>{trainee.primaryNumber}</dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.education')}</dt>
            <dd>{trainee.educationLevel}</dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.lastContact')}</dt>
            <dd>{formatLastContact(t, trainee.lastContactDays)}</dd>
          </div>
        </dl>
      </div>

      <section className="rp-status-form" aria-label={t('resourcePerson.trainees.updateTitle')}>
        <span className="rp-block-title">{t('resourcePerson.trainees.updateTitle')}</span>

        <div className="rp-stage-row">
          {TRAINEE_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              className={stage === status ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setStatus(stage)}
            >
              {t(`status.${stage}`)}
            </button>
          ))}
        </div>

        <label className="call-field">
          <span>{t('resourcePerson.trainees.descriptionLabel')}</span>
          <textarea
            rows={3}
            value={description}
            placeholder={t('resourcePerson.trainees.descriptionPlaceholder')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {needsRecommendations && (
          <div className="rp-recommendations">
            <p className="rp-hint">{t('resourcePerson.trainees.completionHint')}</p>
            <label className="call-field">
              <span>{t('resourcePerson.trainees.nextCourse')}</span>
              <select value={nextCourse} onChange={(event) => setNextCourse(event.target.value)}>
                {NEXT_COURSE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="call-field">
              <span>{t('resourcePerson.trainees.jobRecommendation')}</span>
              <select value={job} onChange={(event) => setJob(event.target.value)}>
                {JOB_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {error && (
          <p className="rp-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="rp-saved" role="status">
            {saved}
          </p>
        )}

        <div className="rp-form-actions">
          <button type="button" className="btn btn-primary btn-small" onClick={save}>
            {t('resourcePerson.trainees.saveStatus')}
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={onFlag}>
            {t('resourcePerson.trainees.flag')}
          </button>
        </div>
      </section>

      {trainee.certificateId && (
        <section className="rp-certificate" aria-label={t('resourcePerson.trainees.certificateTitle')}>
          <span className="rp-block-title">{t('resourcePerson.trainees.certificateTitle')}</span>
          <div className="rp-certificate-body">
            <span className="rp-certificate-id">{trainee.certificateId}</span>
            <span className="rp-certificate-line">
              {t('resourcePerson.trainees.certificateLine', { name: trainee.name, course: trainee.course })}
            </span>
            <span className="rp-certificate-meta">
              {t('resourcePerson.trainees.certificateMeta', {
                centre: trainee.centre ?? '—',
                trainer: RESOURCE_PERSON.name,
              })}
            </span>
          </div>
          <dl className="rp-reco">
            <div>
              <dt>{t('resourcePerson.trainees.nextCourse')}</dt>
              <dd>{trainee.nextCourse ?? t('common.none')}</dd>
            </div>
            <div>
              <dt>{t('resourcePerson.trainees.jobRecommendation')}</dt>
              <dd>{trainee.jobRecommendation ?? t('common.none')}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rp-history" aria-label={t('resourcePerson.trainees.historyTitle')}>
        <span className="rp-block-title">{t('resourcePerson.trainees.historyTitle')}</span>
        <ol className="timeline">
          {[...trainee.statusHistory].reverse().map((entry, index) => (
            <li key={`${entry.status}-${index}`} className={`timeline-item is-${STATUS_TONE[entry.status]}`}>
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
      </section>
    </aside>
  )
}
