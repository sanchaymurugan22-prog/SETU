import { useTranslation } from 'react-i18next'
import { SetuMark } from '../../components/SetuMark'
import { qualificationFor, RESOURCE_PERSON, type Trainee } from '../../data/resourcePerson'
import '../../styles/certificate.css'

/** Long-form date in the interface language, falling back to the ISO string. */
function formatDate(iso: string | null, language: string): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

/**
 * The printable completion certificate.
 *
 * Names, IDs, courses, centres and dates are data and stay as they are; every label
 * around them is translated. The ministry emblem is still the agreed placeholder — the
 * real artwork drops into the same box.
 */
export function CertificateSheet({ trainee }: { trainee: Trainee }) {
  const { t, i18n } = useTranslation()
  const qualification = qualificationFor(trainee.course)
  const batch = RESOURCE_PERSON.batches.find((entry) => entry.batchId === trainee.batchId)

  return (
    <article className="certificate-sheet" aria-label={t('certificate.sheetAria', { name: trainee.name })}>
      <div className="certificate-frame">
        <header className="certificate-head">
          <div className="certificate-mark">
            <SetuMark size={46} />
            <span className="certificate-wordmark">SETU</span>
          </div>

          <div className="certificate-authority">
            <span className="certificate-government">{t('common.government')}</span>
            <span className="certificate-ministry">{t('common.ministry')}</span>
            <span className="certificate-scheme">{t('certificate.scheme')}</span>
          </div>

          <div className="certificate-emblem" aria-hidden="true">
            {t('common.emblemPlaceholder')}
          </div>
        </header>

        <div className="certificate-body">
          <h1 className="certificate-title">{t('certificate.title')}</h1>
          <span className="certificate-rule" aria-hidden="true" />

          <p className="certificate-certifies">{t('certificate.certifies')}</p>
          <p className="certificate-name">{trainee.name}</p>
          <p className="certificate-beneficiary-id">{trainee.beneficiaryId}</p>

          <p className="certificate-completed">{t('certificate.completed')}</p>
          <p className="certificate-course">{trainee.course}</p>
          {qualification && (
            <p className="certificate-qualification">
              {t('certificate.nsqf', { level: qualification.level })} · {qualification.jobRole}
            </p>
          )}

          <dl className="certificate-facts">
            <div>
              <dt>{t('certificate.centreLabel')}</dt>
              <dd>
                {trainee.centre ?? batch?.centre ?? '—'}
                <span className="certificate-fact-sub">
                  {trainee.block} · {trainee.district}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('certificate.periodLabel')}</dt>
              <dd>
                {t('certificate.period', {
                  from: formatDate(trainee.startedOn, i18n.language),
                  to: formatDate(trainee.completedOn, i18n.language),
                })}
                <span className="certificate-fact-sub">
                  {t('certificate.sessions', { count: batch?.totalSessions ?? 0 })}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('certificate.idLabel')}</dt>
              <dd>
                <span className="certificate-id">{trainee.certificateId ?? '—'}</span>
                <span className="certificate-fact-sub">{trainee.batchId}</span>
              </dd>
            </div>
            <div>
              <dt>{t('certificate.issuedLabel')}</dt>
              <dd>{formatDate(trainee.completedOn, i18n.language)}</dd>
            </div>
          </dl>
        </div>

        <footer className="certificate-foot">
          <div className="certificate-signature">
            <span className="certificate-signature-line" aria-hidden="true" />
            <span className="certificate-trainer">{RESOURCE_PERSON.name}</span>
            <span className="certificate-designation">{RESOURCE_PERSON.designation}</span>
            <span className="certificate-designation">
              {RESOURCE_PERSON.block} · {RESOURCE_PERSON.district}
            </span>
          </div>

          <div className="certificate-seal" role="img" aria-label={t('certificate.sealAria')}>
            <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
              <circle cx="60" cy="60" r="56" fill="none" stroke="#0a303e" strokeWidth="2" />
              <circle cx="60" cy="60" r="48" fill="none" stroke="#0088b0" strokeWidth="1" />
              {/* Two arcs, so both halves of the legend read upright: over the top
                  clockwise, under the bottom anticlockwise. */}
              <path id="certificate-seal-top" d="M 16 60 A 44 44 0 0 1 104 60" fill="none" />
              <path id="certificate-seal-bottom" d="M 23 60 A 37 37 0 0 0 97 60" fill="none" />
              <text className="certificate-seal-text" fill="#0a303e">
                <textPath href="#certificate-seal-top" startOffset="50%" textAnchor="middle">
                  SETU · SKILL EMPOWERMENT
                </textPath>
              </text>
              <text className="certificate-seal-text" fill="#0a303e">
                <textPath href="#certificate-seal-bottom" startOffset="50%" textAnchor="middle">
                  THROUGH UNIFIED-VOICE
                </textPath>
              </text>
              <g transform="translate(37 34) scale(0.72)">
                <path d="M14 46 Q32 28 50 46" fill="none" stroke="#0088b0" strokeWidth="5" strokeLinecap="round" />
                <path d="M14 46 Q32 15 50 46" fill="none" stroke="#38a6cf" strokeWidth="3.4" strokeLinecap="round" />
                <path d="M14 46 Q32 3 50 46" fill="none" stroke="#99e0ff" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M4 50 H18 M46 50 H60" fill="none" stroke="#0a303e" strokeWidth="6" />
              </g>
              <text x="60" y="82" textAnchor="middle" className="certificate-seal-scheme" fill="#605d5d">
                PM-AJAY
              </text>
            </svg>
          </div>

          <div className="certificate-verification">
            <span className="certificate-verification-title">{t('certificate.verificationTitle')}</span>
            <p>{t('certificate.verification', { id: trainee.certificateId ?? '—' })}</p>
          </div>
        </footer>
      </div>
    </article>
  )
}
