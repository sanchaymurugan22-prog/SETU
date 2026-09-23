import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { VoiceCallExperience } from '../../voice/VoiceCallExperience'
import '../../styles/voice.css'

/**
 * The beneficiary's call, shown inside the Call Console so it can be demonstrated
 * without leaving the consoles. A call placed here writes to the same in-memory store as
 * the standalone page, so it turns up in Completed Calls and on the Gap Map.
 */
export function AiDemoCallSection() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const rehearseContested = params.get('rehearse') === 'contested'

  const title = t('sections.executive.ai-demo.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  return (
    <>
      <header className="section-header voice-section-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">{t('voice.demoSubtitle')}</p>
        </div>
      </header>

      <div className="section-body voice-section-body">
        <VoiceCallExperience
          rehearseContested={rehearseContested}
          // The console opens on a finished call so there is something to read at once.
          // The standalone /call page does not: there, somebody is actually ringing in.
          showExample
          note={t('voice.demoNote')}
        />
      </div>
    </>
  )
}
