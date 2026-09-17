import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLastContact } from '../../i18n/format'
import {
  EMPLOYMENT_TONE,
  TRAINING_TONE,
  type Beneficiary,
  type CallRecord,
} from '../../data/jharkhandBeneficiaries'

const TABS = ['timeline', 'calls', 'attendance', 'outcome'] as const
type Tab = (typeof TABS)[number]

const HANDLED_BY_KEY: Record<CallRecord['handledBy'], string> = {
  ai: 'AI',
  executive: 'roles.executive',
  resourcePerson: 'roles.resourcePerson',
}

/** The full journey for one beneficiary: profile, timeline, calls, attendance, outcome. */
export function BeneficiaryJourney({
  person,
  onClose,
  onAction,
}: {
  person: Beneficiary
  onClose: () => void
  onAction: (person: Beneficiary, action: 'call' | 'officer') => void
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('timeline')

  return (
    <aside className="journey" aria-label={t('beneficiaries.journey.aria', { name: person.name })}>
      <div className="journey-head">
        <div>
          <span className="journey-eyebrow">{t('beneficiaries.journey.eyebrow')}</span>
          <h2>{person.name}</h2>
          <span className="journey-id">
            {person.beneficiaryId} · {person.age} {person.gender} · {person.preferredLanguage}
          </span>
        </div>
        <button type="button" className="journey-close" onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>
      </div>

      <div className="journey-summary">
        <div className="journey-chips">
          <span className={`chip is-${TRAINING_TONE[person.trainingStatus]}`}>
            {t(`training.${person.trainingStatus}`)}
          </span>
          <span className={`chip is-${EMPLOYMENT_TONE[person.employmentStatus]}`}>
            {t(`employment.${person.employmentStatus}`)}
          </span>
          {person.aiFlags.map((flag) => (
            <span className="chip is-flag" key={flag}>
              {t('beneficiaries.journey.flagChip', { flag })}
            </span>
          ))}
          {person.isStalled && <span className="chip is-stalled">{t('beneficiaries.journey.stalled')}</span>}
        </div>

        <dl className="journey-facts">
          <div>
            <dt>{t('beneficiaries.journey.facts.location')}</dt>
            <dd>
              {person.district} · {person.block} · {person.village}
            </dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.primaryPhone')}</dt>
            <dd>{person.primaryNumber}</dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.secondaryPhone')}</dt>
            <dd>{person.secondaryNumber ?? t('beneficiaries.journey.noSecondary')}</dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.education')}</dt>
            <dd>{person.educationLevel}</dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.currentWork')}</dt>
            <dd>{person.currentWork}</dd>
          </div>
          <div>
            <dt>{t('beneficiaries.journey.facts.lastContact')}</dt>
            <dd>{formatLastContact(t, person.lastContactDays)}</dd>
          </div>
        </dl>
      </div>

      <div className="journey-tabs" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? 'journey-tab is-active' : 'journey-tab'}
            onClick={() => setTab(name)}
          >
            {name === 'calls'
              ? t('beneficiaries.journey.tabs.calls', { count: person.calls.length })
              : t(`beneficiaries.journey.tabs.${name}`)}
          </button>
        ))}
      </div>

      <div className="journey-body">
        {tab === 'timeline' && (
          <ol className="timeline">
            {person.journey.map((event, index) => (
              <li key={`${event.title}-${index}`} className={`timeline-item is-${event.tone}`}>
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-content">
                  <div className="timeline-title-row">
                    <span className="timeline-title">{event.title}</span>
                    <span className="timeline-when">{event.when}</span>
                  </div>
                  <span className="timeline-detail">{event.detail}</span>
                  {event.sessions && (
                    <div className="session-strip" aria-hidden="true">
                      {event.sessions.map((mark, session) => (
                        <span key={session} className={`session is-${mark}`} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {tab === 'calls' && (
          <ul className="call-list">
            {person.calls.map((call, index) => (
              <li key={`${call.when}-${index}`}>
                <div className="call-head">
                  <span className={`chip is-${call.handledBy === 'ai' ? 'cyan' : 'neutral'}`}>
                    {call.handledBy === 'ai' ? 'AI' : t(HANDLED_BY_KEY[call.handledBy])}
                  </span>
                  <span className="call-when">{call.when}</span>
                </div>
                <p className="call-summary">{call.summary}</p>
                <span className="call-outcome">{call.outcome}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'attendance' &&
          (person.attendance ? (
            <div className="attendance-view">
              <div className="attendance-headline">
                <span className="attendance-count">
                  {person.attendance.attended}
                  <span className="attendance-total"> / {person.attendance.total}</span>
                </span>
                <span className="attendance-label">
                  {t('beneficiaries.journey.attendanceLabel', {
                    held: person.attendance.sessions.length,
                    centre: person.centre,
                  })}
                </span>
              </div>
              <div className="session-grid">
                {person.attendance.sessions.map((mark, index) => (
                  <span
                    key={index}
                    className={`session-box is-${mark}`}
                    title={`${t('beneficiaries.journey.sessionTitle', { number: index + 1 })}: ${
                      mark === 'present' ? t('beneficiaries.journey.present') : t('beneficiaries.journey.absent')
                    }`}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <div className="attendance-key">
                <span>
                  <span className="session is-present" aria-hidden="true" /> {t('beneficiaries.journey.present')}
                </span>
                <span>
                  <span className="session is-absent" aria-hidden="true" /> {t('beneficiaries.journey.absent')}
                </span>
              </div>
            </div>
          ) : (
            <p className="journey-empty">{t('beneficiaries.journey.notEnrolled')}</p>
          ))}

        {tab === 'outcome' && (
          <div className="outcome-view">
            <div className="outcome-row">
              <span className="outcome-label">{t('beneficiaries.journey.outcome.training')}</span>
              <span className={`chip is-${TRAINING_TONE[person.trainingStatus]}`}>
                {t(`training.${person.trainingStatus}`)}
              </span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">{t('beneficiaries.journey.outcome.employment')}</span>
              <span className={`chip is-${EMPLOYMENT_TONE[person.employmentStatus]}`}>
                {t(`employment.${person.employmentStatus}`)}
              </span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">{t('beneficiaries.journey.outcome.outcome')}</span>
              <span className="outcome-value">{person.outcome}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">{t('beneficiaries.journey.outcome.course')}</span>
              <span className="outcome-value">{person.course}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">{t('beneficiaries.journey.outcome.centre')}</span>
              <span className="outcome-value">{person.centre ?? t('beneficiaries.journey.noCentre')}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">{t('beneficiaries.journey.outcome.interests')}</span>
              <span className="outcome-value">{person.interests.join(', ')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="journey-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={() => onAction(person, 'call')}>
          {t('beneficiaries.journey.scheduleCall')}
        </button>
        <button type="button" className="btn btn-outline btn-small" onClick={() => onAction(person, 'officer')}>
          {t('beneficiaries.journey.assignOfficer')}
        </button>
      </div>
    </aside>
  )
}
