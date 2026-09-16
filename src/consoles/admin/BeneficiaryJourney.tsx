import { useState } from 'react'
import {
  lastContactLabel,
  STATUS_LABEL,
  STATUS_TONE,
  type Beneficiary,
  type CallRecord,
} from '../../data/jharkhandBeneficiaries'

const TABS = ['timeline', 'calls', 'attendance', 'outcome'] as const
type Tab = (typeof TABS)[number]

const HANDLED_BY_LABEL: Record<CallRecord['handledBy'], string> = {
  ai: 'AI',
  executive: 'Executive',
  resourcePerson: 'Resource person',
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
  const [tab, setTab] = useState<Tab>('timeline')

  return (
    <aside className="journey" aria-label={`Full journey for ${person.name}`}>
      <div className="journey-head">
        <div>
          <span className="journey-eyebrow">Full journey</span>
          <h2>{person.name}</h2>
          <span className="journey-id">
            {person.beneficiaryId} · {person.age} {person.gender} · {person.preferredLanguage}
          </span>
        </div>
        <button type="button" className="journey-close" onClick={onClose} aria-label="Close journey panel">
          ✕
        </button>
      </div>

      <div className="journey-summary">
        <div className="journey-chips">
          <span className={`chip is-${STATUS_TONE[person.status]}`}>{STATUS_LABEL[person.status]}</span>
          {person.aiFlags.map((flag) => (
            <span className="chip is-flag" key={flag}>
              AI: {flag}
            </span>
          ))}
          {person.isStalled && <span className="chip is-stalled">Stalled</span>}
        </div>

        <dl className="journey-facts">
          <div>
            <dt>Location</dt>
            <dd>
              {person.district} · {person.block} · {person.village}
            </dd>
          </div>
          <div>
            <dt>Primary phone</dt>
            <dd>{person.primaryNumber}</dd>
          </div>
          <div>
            <dt>Secondary phone</dt>
            <dd>{person.secondaryNumber ?? 'None · basic phone only'}</dd>
          </div>
          <div>
            <dt>Education</dt>
            <dd>{person.educationLevel}</dd>
          </div>
          <div>
            <dt>Current work</dt>
            <dd>{person.currentWork}</dd>
          </div>
          <div>
            <dt>Last contact</dt>
            <dd>{lastContactLabel(person.lastContactDays)}</dd>
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
            {name === 'calls' ? `Calls · ${person.calls.length}` : name[0]!.toUpperCase() + name.slice(1)}
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
                    {HANDLED_BY_LABEL[call.handledBy]}
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
                  sessions attended · {person.attendance.sessions.length} held so far at {person.centre}
                </span>
              </div>
              <div className="session-grid">
                {person.attendance.sessions.map((mark, index) => (
                  <span key={index} className={`session-box is-${mark}`} title={`Session ${index + 1}: ${mark}`}>
                    {index + 1}
                  </span>
                ))}
              </div>
              <div className="attendance-key">
                <span>
                  <span className="session is-present" aria-hidden="true" /> Present
                </span>
                <span>
                  <span className="session is-absent" aria-hidden="true" /> Absent
                </span>
              </div>
            </div>
          ) : (
            <p className="journey-empty">
              Not enrolled yet — attendance starts once a seat is allotted and the first session is held.
            </p>
          ))}

        {tab === 'outcome' && (
          <div className="outcome-view">
            <div className="outcome-row">
              <span className="outcome-label">Current status</span>
              <span className={`chip is-${STATUS_TONE[person.status]}`}>{STATUS_LABEL[person.status]}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">Outcome</span>
              <span className="outcome-value">{person.outcome}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">Recommended course</span>
              <span className="outcome-value">{person.course}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">Centre</span>
              <span className="outcome-value">{person.centre ?? 'No centre in this block yet'}</span>
            </div>
            <div className="outcome-row">
              <span className="outcome-label">Interests recorded</span>
              <span className="outcome-value">{person.interests.join(', ')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="journey-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={() => onAction(person, 'call')}>
          Schedule call
        </button>
        <button type="button" className="btn btn-outline btn-small" onClick={() => onAction(person, 'officer')}>
          Assign officer
        </button>
      </div>
    </aside>
  )
}
