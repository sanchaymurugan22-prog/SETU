import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { languageNameFor } from '../lib/languageDetection'
import { SAMPLE_DETECTION, sampleCallState } from './sampleCall'
import { STAGE_ORDER, type StageId } from './script'
import { useVoiceCall } from './useVoiceCall'
import '../styles/voice.css'

/** Stages shown in the tracker — the internal ones are not worth a row. */
const VISIBLE_STAGES: StageId[] = STAGE_ORDER.filter((stage) => stage !== 'done')

export interface VoiceCallExperienceProps {
  /** Forces a contested detection so Case F can be rehearsed. */
  rehearseContested?: boolean
  /**
   * Show a worked example before the first call, so the section explains itself without
   * anyone having to place a call first. Off by default: the standalone /call page is a
   * beneficiary ringing in, and they should meet an empty line, not somebody else's call.
   */
  showExample?: boolean
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
export function VoiceCallExperience({
  rehearseContested = false,
  showExample = false,
  note,
  onElapsed,
}: VoiceCallExperienceProps) {
  const { t } = useTranslation()
  const call = useVoiceCall({ rehearseContested })
  const [typed, setTyped] = useState('')
  const [started, setStarted] = useState(false)

  /**
   * Until Start is pressed, every panel reads from the worked example instead of the
   * empty live state. One switch rather than a second set of markup, so the example
   * cannot drift away from how a real call is displayed — it is rendered by exactly the
   * same code. The rehearsal path keeps its empty opening, because the whole point there
   * is to watch the detection contest happen live.
   */
  const example = showExample && !rehearseContested && !started
  const sample = useMemo(() => sampleCallState(), [])
  const state = example ? sample : call.state
  const detection = example ? SAMPLE_DETECTION : call.detection

  useEffect(() => {
    if (!started || call.phase === 'ended') return
    const timer = window.setInterval(() => call.setElapsed((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [call, started])

  useEffect(() => {
    onElapsed?.(started ? call.elapsed : 0)
  }, [call.elapsed, onElapsed, started])

  const stageIndex = VISIBLE_STAGES.indexOf(state.stage)

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

        {example && (
          <div className="voice-example" role="status">
            <span className="voice-example-label">{t('voice.exampleLabel')}</span>
            <span>{t('voice.exampleBody')}</span>
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
          {state.turns.length === 0 ? (
            <p className="voice-empty">{t('voice.empty')}</p>
          ) : (
            state.turns.map((turn, index) => (
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
          {detection ? (
            <>
              <div className="voice-detected">
                <span className="voice-detected-name">{detection.languageName}</span>
                <span className={`voice-agreement is-${detection.agreement}`}>
                  {t(`detection.agreement.${detection.agreement}`)}
                </span>
              </div>
              <div className="voice-models">
                <div className="voice-model">
                  <span>{t('detection.primaryModel')}</span>
                  <span className="voice-model-answer">
                    {languageNameFor(detection.primary.langCode)}
                    <span className="voice-model-score">{detection.primary.langScore.toFixed(2)}</span>
                  </span>
                </div>
                <div className="voice-model">
                  <span>{t('detection.secondaryModel')}</span>
                  <span className="voice-model-answer">
                    {detection.secondary ? (
                      <>
                        {languageNameFor(detection.secondary.langCode)}
                        <span className="voice-model-score">{detection.secondary.langScore.toFixed(2)}</span>
                      </>
                    ) : (
                      t('detection.noAnswer')
                    )}
                  </span>
                </div>
              </div>
              {state.dialectGap && <span className="voice-chip is-alert">{t('detection.dialectGap')}</span>}
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
              <dd>{state.profile.name ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('voice.captured.location')}</dt>
              <dd>
                {[state.profile.village, state.profile.block, state.profile.district]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </dd>
            </div>
            <div>
              <dt>{t('voice.captured.work')}</dt>
              <dd>{state.profile.currentWork ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('voice.captured.family')}</dt>
              <dd>{state.profile.familyOccupation ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('voice.captured.education')}</dt>
              <dd>
                {state.profile.schoolYears === null
                  ? '—'
                  : t('voice.captured.classValue', { years: state.profile.schoolYears })}
              </dd>
            </div>
            <div>
              <dt>{t('voice.captured.recommendation')}</dt>
              <dd>
                {state.recommendation
                  ? `${state.recommendation.course.course} · ${state.recommendation.centreName}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
  </main>
  )
}
