import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { SetuMark } from '../components/SetuMark'
import { VoiceCallExperience } from '../voice/VoiceCallExperience'
import '../styles/voice.css'

/**
 * The call on its own page, reachable without signing in — the beneficiary side of SETU.
 * The same experience is embedded in the Call Console's AI Demo Call section; this route
 * stays because it is the one that can be opened on a phone, and because
 * ?rehearse=contested is the rehearsal path for the dialect-gap call.
 */
export function VoiceCallPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const rehearseContested = params.get('rehearse') === 'contested'
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    document.title = `${t('voice.title')} · SETU`
  }, [t])

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="voice-page">
      <header className="voice-bar">
        <div className="voice-brand">
          <SetuMark size={34} tone="onDark" />
          <span className="voice-wordmark">SETU</span>
          <span className="voice-subtitle">{t('voice.title')}</span>
        </div>
        <div className="voice-bar-right">
          <span className="voice-timer">{`${minutes}:${seconds}`}</span>
          <Link className="voice-exit" to="/login">
            {t('voice.backToConsoles')}
          </Link>
        </div>
      </header>

      <VoiceCallExperience rehearseContested={rehearseContested} onElapsed={setElapsed} />
    </div>
  )
}
