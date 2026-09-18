import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDuration, OUTCOME_KEYS, type OutcomeKey } from '../../data/jharkhandCalls'
import { useCallSession } from './CallSessionContext'
import { WriteError } from '../admin/WriteError'

/**
 * Stage 3. Opens when the call ends and offers exactly one way out: Send.
 * There is no close button, no backdrop dismissal and no save-draft.
 */
export function ReportReviewModal() {
  const { t } = useTranslation()
  const { reportFor, draft, editDraft, sendReport, writeError, writePending, clearWriteError } = useCallSession()
  const [newAction, setNewAction] = useState('')
  const [touched, setTouched] = useState(false)

  if (!reportFor || !draft) return null

  const record = reportFor.record
  const canSend = draft.discussion.trim().length > 0

  const addAction = () => {
    const action = newAction.trim()
    if (!action) return
    editDraft({ actions: [...draft.actions, action] })
    setNewAction('')
  }

  return (
    <div className="report-backdrop" role="presentation">
      <div className="report-modal" role="dialog" aria-modal="true" aria-label={t('callConsole.report.title')}>
        <div className="report-head">
          <div>
            <span className="report-required">{t('callConsole.report.required')}</span>
            <h2>{t('callConsole.report.title')}</h2>
          </div>
          <span className="report-for">
            {t('callConsole.report.forCall', {
              name: record.name,
              ref: reportFor.call.callId.toUpperCase(),
              duration: formatDuration(reportFor.elapsedSeconds),
            })}
          </span>
        </div>

        <p className="report-warning">{t('callConsole.report.warning')}</p>

        <div className="report-body">
          <WriteError error={writeError} onDismiss={clearWriteError} />

          <label className="report-field">
            <span className="report-label">{t('callConsole.report.discussion')}</span>
            <textarea
              value={draft.discussion}
              rows={4}
              onChange={(event) => editDraft({ discussion: event.target.value })}
              onBlur={() => setTouched(true)}
            />
          </label>

          <div className="report-row">
            <label className="report-field">
              <span className="report-label">{t('callConsole.report.course')}</span>
              <input value={draft.course} onChange={(event) => editDraft({ course: event.target.value })} />
            </label>
            <label className="report-field">
              <span className="report-label">{t('callConsole.report.outcome')}</span>
              <select value={draft.outcome} onChange={(event) => editDraft({ outcome: event.target.value as OutcomeKey })}>
                {OUTCOME_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`callConsole.outcome.${key}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="report-field">
            <span className="report-label">{t('callConsole.report.actions')}</span>
            <ul className="report-actions">
              {draft.actions.map((action, index) => (
                <li key={`${action}-${index}`}>
                  <input
                    value={action}
                    onChange={(event) =>
                      editDraft({ actions: draft.actions.map((item, i) => (i === index ? event.target.value : item)) })
                    }
                  />
                  <button
                    type="button"
                    className="report-remove"
                    aria-label={t('callConsole.report.removeAction')}
                    onClick={() => editDraft({ actions: draft.actions.filter((_, i) => i !== index) })}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="report-add">
              <input
                value={newAction}
                placeholder={t('callConsole.report.actionPlaceholder')}
                onChange={(event) => setNewAction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addAction()
                  }
                }}
              />
              <button type="button" className="btn btn-outline btn-small" onClick={addAction}>
                {t('callConsole.report.addAction')}
              </button>
            </div>
          </div>

          <div className="report-channels">
            <span className="report-label">{t('callConsole.report.sendingTo')}</span>
            <div className="report-channel-list">
              <span className="report-channel">{t('callConsole.report.smsPrimary', { number: record.primaryNumber })}</span>
              <span className="report-channel">
                {t('callConsole.report.whatsappPrimary', { number: record.primaryNumber })}
              </span>
              {record.secondaryNumber && (
                <>
                  <span className="report-channel">
                    {t('callConsole.report.smsSecondary', { number: record.secondaryNumber })}
                  </span>
                  <span className="report-channel">
                    {t('callConsole.report.whatsappSecondary', { number: record.secondaryNumber })}
                  </span>
                </>
              )}
            </div>
            <span className="report-language">
              {t('callConsole.report.languageNote', { language: reportFor.beneficiary.preferredLanguage })}
            </span>
          </div>
        </div>

        <div className="report-foot">
          <span className="report-cannot-skip">
            {touched && !canSend ? t('callConsole.report.discussionRequired') : t('callConsole.report.cannotSkip')}
          </span>
          <button type="button" className="btn btn-primary" disabled={!canSend || writePending} onClick={sendReport}>
            {t('callConsole.report.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
