import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FIELD_OFFICERS,
  FLAG_STATUSES,
  loadAdminFlags,
  type AdminFlagRecord,
  type FlagStatus,
} from '../../data/adminConsole'
import { useDataSource } from '../../data/useDataSource'
import { SourceBadge } from './SourceBadge'
import '../../styles/admin.css'

const STATUS_TONE: Record<FlagStatus, string> = { open: 'bright', assigned: 'cyan', resolved: 'teal' }

/** Cases a resource person escalated. Assignment control lives here (SETU-SPEC 6.7). */
export function AdminFlagsSection() {
  const { t } = useTranslation()
  const source = useDataSource('adminFlags')
  const [flags, setFlags] = useState<AdminFlagRecord[]>(loadAdminFlags)
  const [status, setStatus] = useState<FlagStatus | 'all'>('all')
  const [assigning, setAssigning] = useState<AdminFlagRecord | null>(null)
  const [officerId, setOfficerId] = useState(FIELD_OFFICERS[0]!.userId)
  const [instruction, setInstruction] = useState('')
  const [error, setError] = useState<string | null>(null)

  const title = t('sections.admin.flags.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(
    () => (status === 'all' ? flags : flags.filter((flag) => flag.status === status)),
    [flags, status],
  )

  const counts = useMemo(() => {
    const map = new Map<FlagStatus, number>()
    for (const flag of flags) map.set(flag.status, (map.get(flag.status) ?? 0) + 1)
    return map
  }, [flags])

  const assign = () => {
    if (!assigning) return
    if (instruction.trim().length < 10) {
      setError(t('admin.flags.instructionRequired'))
      return
    }
    const officer = FIELD_OFFICERS.find((entry) => entry.userId === officerId)!
    setFlags((current) =>
      current.map((flag) =>
        flag.flagId === assigning.flagId
          ? { ...flag, status: 'assigned', assignedToId: officer.userId, assignedToName: officer.name }
          : flag,
      ),
    )
    setAssigning(null)
    setInstruction('')
    setError(null)
  }

  const resolve = (flagId: string) =>
    setFlags((current) =>
      current.map((flag) => (flag.flagId === flagId ? { ...flag, status: 'resolved' } : flag)),
    )

  return (
    <>
      <header className="section-header admin-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('admin.flags.subtitle', { open: counts.get('open') ?? 0, total: flags.length })}
          </p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('admin.flags.sourceLabel')}</span>
          <span className="call-scope-value">{t('admin.flags.sourceValue')}</span>
        </div>
        <SourceBadge state={source} count={flags.length} />
      </header>

      <div className="section-body admin-body">
        <div className="call-filters">
          <span className="call-filter-label">{t('admin.flags.statusLabel')}</span>
          <button
            type="button"
            className={status === 'all' ? 'call-chip is-selected' : 'call-chip'}
            onClick={() => setStatus('all')}
          >
            {t('common.all')} · {flags.length}
          </button>
          {FLAG_STATUSES.map((key) => (
            <button
              key={key}
              type="button"
              className={status === key ? 'call-chip is-selected' : 'call-chip'}
              onClick={() => setStatus(status === key ? 'all' : key)}
            >
              {t(`admin.flags.status.${key}`)} · {counts.get(key) ?? 0}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="admin-panel">
            <p className="call-empty">{t('admin.flags.empty')}</p>
          </div>
        ) : (
          <ul className="admin-flag-list">
            {visible.map((flag) => (
              <li className={`admin-flag is-${flag.status}`} key={flag.flagId}>
                <div className="admin-flag-head">
                  <div>
                    <span className="journey-eyebrow">
                      {t('admin.flags.raisedBy', { name: flag.raisedBy, date: flag.raisedLabel })}
                    </span>
                    <h2>{flag.name}</h2>
                    <span className="journey-id">
                      {flag.beneficiaryId} · {flag.block} · {flag.district} · {flag.course}
                    </span>
                  </div>
                  <div className="admin-flag-chips">
                    <span className={`chip is-${STATUS_TONE[flag.status]}`}>
                      {t(`admin.flags.status.${flag.status}`)}
                    </span>
                    <span className="chip is-flag">{t(`resourcePerson.flagReason.${flag.reason}`)}</span>
                  </div>
                </div>

                <p className="admin-flag-note">{flag.note}</p>

                <div className="admin-flag-foot">
                  {flag.assignedToName ? (
                    <span className="admin-flag-assigned">
                      {t('admin.flags.assignedTo', { name: flag.assignedToName })}
                    </span>
                  ) : (
                    <span className="admin-flag-unassigned">{t('admin.flags.unassigned')}</span>
                  )}

                  <div className="admin-flag-actions">
                    {flag.status !== 'resolved' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => {
                          setAssigning(flag)
                          setOfficerId(flag.assignedToId ?? FIELD_OFFICERS[0]!.userId)
                          setInstruction('')
                          setError(null)
                        }}
                      >
                        {flag.status === 'assigned' ? t('admin.flags.reassign') : t('admin.flags.assign')}
                      </button>
                    )}
                    {flag.status !== 'resolved' && (
                      <button type="button" className="btn btn-outline btn-small" onClick={() => resolve(flag.flagId)}>
                        {t('admin.flags.resolve')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {assigning && (
        <div className="rp-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.flags.assign')}>
          <div className="rp-modal">
            <header className="rp-modal-head">
              <div>
                <span className="journey-eyebrow">{t('admin.flags.assign')}</span>
                <h2>{assigning.name}</h2>
              </div>
              <button type="button" className="journey-close" onClick={() => setAssigning(null)} aria-label={t('common.close')}>
                ✕
              </button>
            </header>
            <div className="rp-modal-body">
              <p className="rp-hint">{assigning.note}</p>
              <label className="call-field">
                <span>{t('admin.flags.officer')}</span>
                <select value={officerId} onChange={(event) => setOfficerId(event.target.value)}>
                  {FIELD_OFFICERS.map((officer) => (
                    <option key={officer.userId} value={officer.userId}>
                      {officer.name} · {officer.role} · {officer.district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="call-field">
                <span>{t('admin.flags.instruction')}</span>
                <textarea
                  rows={3}
                  value={instruction}
                  placeholder={t('admin.flags.instructionPlaceholder')}
                  onChange={(event) => setInstruction(event.target.value)}
                />
              </label>
              {error && (
                <p className="rp-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className="rp-modal-foot">
              <button type="button" className="btn btn-outline btn-small" onClick={() => setAssigning(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={assign}>
                {t('admin.flags.sendAssignment')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
