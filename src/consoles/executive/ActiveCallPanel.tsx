import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CONFIDENCE_THRESHOLD,
  formatDuration,
  RESOURCE_PERSONS,
  TRANSFER_REASONS,
  type TransferReason,
} from '../../data/jharkhandCalls'
import { useCallSession } from './CallSessionContext'
import { BILINGUAL_GREETING, isDialectGap, languageNameFor } from '../../lib/languageDetection'

/** Stage 2. Identity is visible and every field is editable — but only while the call runs. */
export function ActiveCallPanel() {
  const { t } = useTranslation()
  const { active, editRecord, setNotes, toggleHold, transfer, endCall, allowTransfer } = useCallSession()
  const [showNotes, setShowNotes] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [newConstraint, setNewConstraint] = useState('')
  const [transferReason, setTransferReason] = useState<TransferReason>('course-question')
  const [resourcePersonId, setResourcePersonId] = useState(RESOURCE_PERSONS[0]!.userId)

  if (!active) return null
  const { record, call, beneficiary } = active

  const addTo = (field: 'interests' | 'constraints', value: string, reset: () => void) => {
    const item = value.trim()
    if (!item) return
    editRecord({ [field]: [...record[field], item] } as never)
    reset()
  }

  const doTransfer = () => {
    const person = RESOURCE_PERSONS.find((rp) => rp.userId === resourcePersonId)
    if (!person) return
    transfer(transferReason, person.userId, person.name)
  }

  return (
    <>
      <header className="call-active-bar">
        <div className="call-active-who">
          <span className="call-live-dot" aria-hidden="true" />
          <h1>{t('callConsole.active.header', { name: record.name })}</h1>
          <span className="call-active-id">{beneficiary.beneficiaryId}</span>
        </div>
        <div className="call-active-controls">
          <span className="call-timer">{formatDuration(active.elapsedSeconds)}</span>
          {active.onHold && <span className="call-hold-chip">{t('callConsole.active.onHold')}</span>}
          <button type="button" className="btn btn-outline btn-small" onClick={toggleHold}>
            {active.onHold ? t('callConsole.active.resume') : t('callConsole.active.hold')}
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={() => setShowNotes((open) => !open)}>
            {t('callConsole.active.addNote')}
          </button>
          <button type="button" className="btn btn-danger btn-small" onClick={endCall}>
            {t('callConsole.active.endCall')}
          </button>
        </div>
      </header>

      <div className="section-body call-active-body">
        <section className="call-record" aria-label={t('callConsole.active.record')}>
          <div className="call-record-head">
            <span className="call-record-title">{t('callConsole.active.record')}</span>
            <span className="chip is-cyan">{t('callConsole.active.prefilled')}</span>
            <span className="call-record-note">{t('callConsole.active.editingWindow')}</span>
          </div>

          <div className="call-fields">
            <label className="call-field">
              <span>{t('callConsole.active.name')}</span>
              <input value={record.name} onChange={(event) => editRecord({ name: event.target.value })} />
            </label>
            <label className="call-field is-narrow">
              <span>{t('callConsole.active.age')}</span>
              <input
                type="number"
                value={record.age}
                onChange={(event) => editRecord({ age: Number(event.target.value) })}
              />
            </label>
            <label className="call-field is-narrow">
              <span>{t('callConsole.active.gender')}</span>
              <input value={record.gender} onChange={(event) => editRecord({ gender: event.target.value })} />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.district')}</span>
              <input value={record.district} onChange={(event) => editRecord({ district: event.target.value })} />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.block')}</span>
              <input value={record.block} onChange={(event) => editRecord({ block: event.target.value })} />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.village')}</span>
              <input value={record.village} onChange={(event) => editRecord({ village: event.target.value })} />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.education')}</span>
              <input
                value={record.educationLevel}
                onChange={(event) => editRecord({ educationLevel: event.target.value })}
              />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.occupation')}</span>
              <input value={record.currentWork} onChange={(event) => editRecord({ currentWork: event.target.value })} />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.primaryNumber')}</span>
              <input
                value={record.primaryNumber}
                onChange={(event) => editRecord({ primaryNumber: event.target.value })}
              />
            </label>
            <label className="call-field">
              <span>{t('callConsole.active.secondaryNumber')}</span>
              <input
                value={record.secondaryNumber}
                placeholder={t('callConsole.active.noSecondary')}
                onChange={(event) => editRecord({ secondaryNumber: event.target.value })}
              />
            </label>
            <label className="call-field call-consent">
              <span>{t('callConsole.active.consent')}</span>
              <span className="call-consent-row">
                <input
                  type="checkbox"
                  checked={record.consentGiven}
                  onChange={(event) => editRecord({ consentGiven: event.target.checked })}
                />
                {record.consentGiven ? t('callConsole.active.consentGiven') : t('callConsole.active.consentNotGiven')}
              </span>
            </label>
          </div>

          {(['interests', 'constraints'] as const).map((field) => (
            <div className="call-chips" key={field}>
              <span className="call-chips-label">{t(`callConsole.active.${field}`)}</span>
              <div className="call-chips-row">
                {record[field].map((item, index) => (
                  <span className="call-chip" key={`${item}-${index}`}>
                    {item}
                    <button
                      type="button"
                      aria-label={`${t('callConsole.active.removeItem')}: ${item}`}
                      onClick={() => editRecord({ [field]: record[field].filter((_, i) => i !== index) } as never)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  value={field === 'interests' ? newInterest : newConstraint}
                  placeholder={t('callConsole.active.addItem')}
                  onChange={(event) =>
                    field === 'interests' ? setNewInterest(event.target.value) : setNewConstraint(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    if (field === 'interests') addTo('interests', newInterest, () => setNewInterest(''))
                    else addTo('constraints', newConstraint, () => setNewConstraint(''))
                  }}
                />
              </div>
            </div>
          ))}

          {showNotes && (
            <label className="call-field call-notes">
              <span>{t('callConsole.active.notes')}</span>
              <textarea
                rows={3}
                value={active.notes}
                placeholder={t('callConsole.active.notesPlaceholder')}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          )}

          {allowTransfer && <div className="call-transfer">
            <span className="call-transfer-title">{t('callConsole.active.transferTitle')}</span>
            <div className="call-transfer-row">
              <label className="call-field">
                <span>{t('callConsole.active.transferReason')}</span>
                <select
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value as TransferReason)}
                >
                  {TRANSFER_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {t(`callConsole.transferReason.${reason}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="call-field">
                <span>{t('callConsole.active.transferTo')}</span>
                <select value={resourcePersonId} onChange={(event) => setResourcePersonId(event.target.value)}>
                  {RESOURCE_PERSONS.map((person) => (
                    <option key={person.userId} value={person.userId}>
                      {person.name} · {person.block}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-primary btn-small" onClick={doTransfer}>
                {t('callConsole.active.transfer')}
              </button>
            </div>
            {active.transfer && (
              <p className="call-transfer-done" role="status">
                {t('callConsole.active.transferred', {
                  name: active.transfer.resourcePersonName,
                  reason: t(`callConsole.transferReason.${active.transfer.reason}`),
                })}
              </p>
            )}
          </div>}
        </section>

        <aside className="call-ai" aria-label={t('callConsole.active.aiTitle')}>
          <div className="call-detection">
            <span className="call-ai-label">{t('detection.panelTitle')}</span>
            <div className="call-greeting">
              <span className="call-greeting-label">{t('detection.greetingLabel')}</span>
              {BILINGUAL_GREETING.map((line) => (
                <p key={line.code} lang={line.code} className="call-greeting-line">
                  {line.text}
                </p>
              ))}
            </div>
            <div className="call-detected-row">
              <span className="call-detected-language">{call.detection.languageName}</span>
              <span className={`call-agreement is-${call.detection.agreement}`}>
                {t(`detection.agreement.${call.detection.agreement}`)}
              </span>
            </div>
            <div className="call-models">
              <div className="call-model-row">
                <span className="call-model-name">{t('detection.primaryModel')}</span>
                <span className="call-model-answer">
                  {languageNameFor(call.detection.primary.langCode)}
                  <span className="call-confidence">
                    {t('detection.confidenceShort', { score: call.detection.primary.langScore.toFixed(2) })}
                  </span>
                </span>
              </div>
              <div className="call-model-row">
                <span className="call-model-name">{t('detection.secondaryModel')}</span>
                <span className="call-model-answer">
                  {call.detection.secondary ? (
                    <>
                      {languageNameFor(call.detection.secondary.langCode)}
                      <span className="call-confidence">
                        {t('detection.confidenceShort', {
                          score: call.detection.secondary.langScore.toFixed(2),
                        })}
                      </span>
                    </>
                  ) : (
                    t('detection.noAnswer')
                  )}
                </span>
              </div>
            </div>
            <span className="call-detected-note">
              {isDialectGap(call.detection)
                ? t('detection.contestedNote')
                : call.detection.agreement === 'agreed'
                  ? t('detection.agreedNote')
                  : t('detection.unconfirmedNote')}
            </span>
            <span className="call-detected-caveat">{t('detection.synthesisCaveat')}</span>
          </div>

          <span className="call-ai-title">{t('callConsole.active.aiTitle')}</span>
          <span className="call-ai-when">
            {t('callConsole.active.aiCall', { number: call.ai.callNumber, when: call.ai.whenLabel })}
          </span>
          <p className="call-ai-summary">{call.ai.summary}</p>

          <div className="call-ai-block">
            <span className="call-ai-label">{t('callConsole.active.aiRecommended')}</span>
            <span className="call-ai-course">
              {call.ai.recommendedCourse}
              {call.ai.recommendedCentre ? ` · ${call.ai.recommendedCentre}` : ''}
            </span>
            <span className="call-ai-match">{call.ai.matchNote}</span>
            <span className="call-ai-confidence">
              {call.ai.confidence < CONFIDENCE_THRESHOLD
                ? t('callConsole.active.aiConfidence', {
                    score: call.ai.confidence.toFixed(2),
                    threshold: CONFIDENCE_THRESHOLD.toFixed(2),
                  })
                : t('callConsole.active.aiConfidenceOk', { score: call.ai.confidence.toFixed(2) })}
            </span>
          </div>

          <div className="call-ai-block">
            <span className="call-ai-label">{t('callConsole.active.transcript')}</span>
            {call.ai.transcript.map((line, index) => (
              <div className="call-transcript-line" key={index}>
                <span className={line.speaker === 'setu' ? 'call-speaker is-setu' : 'call-speaker is-caller'}>
                  {line.speaker === 'setu' ? t('callConsole.active.speakerSetu') : t('callConsole.active.speakerCaller')}
                </span>
                <span lang={line.lang}>{line.text}</span>
              </div>
            ))}
          </div>

          <div className="call-ai-block">
            <span className="call-ai-label">{t('callConsole.active.priorFlags')}</span>
            <div className="call-ai-flags">
              {call.ai.priorFlags.length > 0 ? (
                call.ai.priorFlags.map((flag) => (
                  <span className="chip is-flag" key={flag}>
                    {flag}
                  </span>
                ))
              ) : (
                <span className="is-muted">{t('callConsole.active.noFlags')}</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
