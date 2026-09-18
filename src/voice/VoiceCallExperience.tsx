import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { languageNameFor } from '../lib/languageDetection'
import { STAGE_ORDER, type StageId } from './script'
import { useVoiceCall } from './useVoiceCall'
import '../styles/voice.css'

/** Stages shown in the tracker — the internal ones are not worth a row. */
const VISIBLE_STAGES: StageId[] = STAGE_ORDER.filter((stage) => stage !== 'done')

export interface VoiceCallExperienceProps {
  /** Forces a contested detection so Case F can be rehearsed. */
  rehearseContested?: boolean
  /** Rendered above the transcript: what this is and who it is for. */
  note?: string
  /** The call timer, when the host has nowhere else to show it. */
  onElapsed?: (seconds: number) => void
}

/**
 * The whole call: transcript, controls, detection, stage tracker and what has been
 * captured. Used both by the standalone /call page and by the Call Console section, so
 * there is one implementation of the demo rather than two that can drift.
 */
export function VoiceCallExperience({ rehearseContested = false, note, onElapsed }: VoiceCallExperienceProps) {
  const { t } = useTranslation()
  const call = useVoiceCall({ rehearseContested })
  const [typed, setTyped] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started || call.phase === 'ended') return
    const timer = window.setInterval(() => call.setElapsed((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [call, started])

  useEffect(() => {
    onElapsed?.(started ? call.elapsed : 0)
  }, [call.elapsed, onElapsed, started])

  const stageIndex = VISIBLE_STAGES.indexOf(call.state.stage)

  const send = async () => {
    const text = typed
    setTyped('')
    await call.submitTyped(text)
  }

  return (
  <main className="voice-main">
      <section className="voice-call" aria-label={t('voice.transcriptTitle')}>
      {note && <p className="voice-note">{note}</p>}

      {rehearseContested && (
          <div className="voice-rehearsal" role="status">
            {t('voice.rehearsalContested')}
          </div>
        )}

        <div className={`voice-state is-${call.phase}`} role="status" aria-live="polite">
          <span className="voice-state-dot" aria-hidden="true" />
          <span className="voice-state-text">{t(`voice.phase.${call.phase}`)}</span>
          {call.status.textOnly && <span className="voice-chip is-warn">{t('voice.textOnly')}</span>}
        </div>

        {call.status.micError && (
          <div className="voice-alert" role="alert">
            <strong>{t(`voice.mic.${call.status.micError}Title`)}</strong>
            <span>{t(`voice.mic.${call.status.micError}Body`)}</span>
          </div>
        )}

        {call.status.notice && (
          <div className="voice-notice" role="status">
            {t(`voice.notice.${call.status.notice}`)}
          </div>
        )}

        <div className="voice-transcript">
          {call.state.turns.length === 0 ? (
            <p className="voice-empty">{t('voice.empty')}</p>
          ) : (
            call.state.turns.map((turn, index) => (
              <div className={`voice-turn is-${turn.speaker}`} key={`${turn.stage}-${index}`}>
                <span className="voice-turn-who">
                  {turn.speaker === 'setu' ? t('voice.setu') : t('voice.caller')}
                </span>
                <p className="voice-turn-text">{turn.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="voice-controls">
          {!started ? (
            <button
              type="button"
              className="btn btn-primary voice-start"
              onClick={async () => {
                setStarted(true)
                await call.start()
              }}
            >
              {t('voice.startCall')}
            </button>
          ) : call.phase === 'ended' ? (
            <div className="voice-ended">
              <span className={`voice-outcome is-${call.state.outcome}`}>
                {t(`voice.outcome.${call.state.outcome}`)}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  call.reset()
                  setStarted(false)
                }}
              >
                {t('voice.newCall')}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={call.phase === 'listening' ? 'voice-mic is-recording' : 'voice-mic'}
                onMouseDown={call.beginListening}
                onMouseUp={call.endListening}
                onTouchStart={call.beginListening}
                onTouchEnd={call.endListening}
                disabled={call.phase === 'thinking' || call.phase === 'speaking'}
              >
                <span className="voice-mic-dot" aria-hidden="true" />
                {call.phase === 'listening' ? t('voice.releaseToSend') : t('voice.holdToSpeak')}
              </button>

              <div className="voice-typed">
                <label className="visually-hidden" htmlFor="voice-typed-input">
                  {t('voice.typedLabel')}
                </label>
                <input
                  id="voice-typed-input"
                  type="text"
                  value={typed}
                  placeholder={t('voice.typedPlaceholder')}
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void send()
                  }}
                />
                <button type="button" className="btn btn-outline btn-small" onClick={() => void send()}>
                  {t('voice.send')}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <aside className="voice-side">
        <section className="voice-panel">
          <span className="voice-panel-title">{t('detection.panelTitle')}</span>
          {call.detection ? (
            <>
              <div className="voice-detected">
                <span className="voice-detected-name">{call.detection.languageName}</span>
                <span className={`voice-agreement is-${call.detection.agreement}`}>
                  {t(`detection.agreement.${call.detection.agreement}`)}
                </span>
              </div>
              <div className="voice-models">
                <div className="voice-model">
                  <span>{t('detection.primaryModel')}</span>
                  <span className="voice-model-answer">
                    {languageNameFor(call.detection.primary.langCode)}
                    <span className="voice-model-score">{call.detection.primary.langScore.toFixed(2)}</span>
                  </span>
                </div>
                <div className="voice-model">
                  <span>{t('detection.secondaryModel')}</span>
                  <span className="voice-model-answer">
                    {call.detection.secondary ? (
                      <>
                        {languageNameFor(call.detection.secondary.langCode)}
                        <span className="voice-model-score">{call.detection.secondary.langScore.toFixed(2)}</span>
                      </>
                    ) : (
                      t('detection.noAnswer')
                    )}
                  </span>
                </div>
              </div>
              {call.state.dialectGap && <span className="voice-chip is-alert">{t('detection.dialectGap')}</span>}
            </>
          ) : (
            <p className="voice-panel-empty">{t('voice.detectionPending')}</p>
          )}
        </section>

        <section className="voice-panel">
          <span className="voice-panel-title">{t('voice.stageTitle')}</span>
          <ol className="voice-stages">
            {VISIBLE_STAGES.map((stage, index) => (
              <li
                key={stage}
                className={
                  index < stageIndex ? 'voice-stage is-done' : index === stageIndex ? 'voice-stage is-now' : 'voice-stage'
                }
              >
                <span className="voice-stage-dot" aria-hidden="true" />
                {t(`voice.stage.${stage}`)}
              </li>
            ))}
          </ol>
        </section>

        <section className="voice-panel">
          <span className="voice-panel-title">{t('voice.capturedTitle')}</span>
          <dl className="voice-captured">
            <div>
              <dt>{t('voice.captured.name')}</dt>
              <dd>{call.state.profile.name ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('voice.captured.location')}</dt>
              <dd>
                {[call.state.profile.village, call.state.profile.block, call.state.profile.district]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </dd>
            </div>
            <div>
              <dt>{t('voice.captured.work')}</dt>
              <dd>{call.state.profile.currentWork ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('voice.captured.family')}</dt>
              <dd>{call.state.profile.familyOccupation ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('voice.captured.education')}</dt>
              <dd>
                {call.state.profile.schoolYears === null
                  ? '—'
                  : t('voice.captured.classValue', { years: call.state.profile.schoolYears })}
              </dd>
            </div>
            <div>
              <dt>{t('voice.captured.recommendation')}</dt>
              <dd>
                {call.state.recommendation
                  ? `${call.state.recommendation.course.course} · ${call.state.recommendation.centreName}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
  </main>
  )
}
