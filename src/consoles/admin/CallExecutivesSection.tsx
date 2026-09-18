import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CALL_EXECUTIVES, type CallExecutive } from '../../data/adminConsole'
import { districts } from '../../data/jharkhandBeneficiaries'
import { formatDuration } from '../../data/jharkhandCalls'
import { SeededDirectoryNote } from './SeededDirectoryNote'
import '../../styles/admin.css'

/** All call executives: activity, new accounts, and deactivation (SETU-SPEC 6.2). */
export function CallExecutivesSection() {
  const { t } = useTranslation()
  const [staff, setStaff] = useState<CallExecutive[]>(CALL_EXECUTIVES)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', district: districts()[0] ?? '' })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const title = t('sections.admin.call-executives.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return staff.filter(
      (person) =>
        (!needle ||
          person.name.toLowerCase().includes(needle) ||
          person.email.toLowerCase().includes(needle) ||
          person.district.toLowerCase().includes(needle)) &&
        (showInactive || person.active),
    )
  }, [search, showInactive, staff])

  const activeCount = staff.filter((person) => person.active).length
  const totalCalls = staff.reduce((sum, person) => sum + person.callsHandled, 0)

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError(t('admin.staff.addError'))
      return
    }
    const created: CallExecutive = {
      userId: `exec-new-${staff.length + 1}`,
      name: form.name.trim(),
      email: form.email.trim(),
      district: form.district,
      active: true,
      joinedLabel: t('admin.staff.joinedToday'),
      callsHandled: 0,
      reportsSent: 0,
      transfersOut: 0,
      avgHandleSeconds: 0,
      lastActiveLabel: t('admin.staff.neverSignedIn'),
    }
    setStaff((current) => [created, ...current])
    setNotice(t('admin.staff.created', { name: created.name }))
    setForm({ name: '', email: '', district: districts()[0] ?? '' })
    setError(null)
    setAdding(false)
  }

  const toggleActive = (userId: string) =>
    setStaff((current) =>
      current.map((person) => (person.userId === userId ? { ...person, active: !person.active } : person)),
    )

  return (
    <>
      <header className="section-header admin-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('admin.executives.subtitle', { active: activeCount, total: staff.length, calls: totalCalls })}
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-small" onClick={() => setAdding(true)}>
          {t('admin.executives.add')}
        </button>
      </header>

      <div className="section-body admin-body">
        <SeededDirectoryNote />

        {notice && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">{t('admin.staff.createdTitle')}</span>
            <span>{notice}</span>
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div className="call-filters">
          <label className="call-search">
            <span className="visually-hidden">{t('admin.staff.searchLabel')}</span>
            <input
              type="search"
              value={search}
              placeholder={t('admin.staff.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={showInactive ? 'call-chip is-selected' : 'call-chip'}
            aria-pressed={showInactive}
            onClick={() => setShowInactive((on) => !on)}
          >
            {t('admin.staff.showInactive')}
          </button>
        </div>

        <div className="admin-panel">
          <div className="admin-table-head admin-exec-grid" aria-hidden="true">
            <span>{t('admin.staff.headers.name')}</span>
            <span>{t('admin.staff.headers.district')}</span>
            <span>{t('admin.executives.headers.calls')}</span>
            <span>{t('admin.executives.headers.transfers')}</span>
            <span>{t('admin.executives.headers.avgHandle')}</span>
            <span>{t('admin.staff.headers.lastActive')}</span>
            <span />
          </div>

          {visible.length === 0 ? (
            <p className="call-empty">{t('admin.staff.empty')}</p>
          ) : (
            <ul className="admin-rows">
              {visible.map((person) => (
                <li className="admin-row admin-exec-grid" key={person.userId}>
                  <span className="ben-cell-name">
                    <span className="ben-name">{person.name}</span>
                    <span className="ben-id">{person.email}</span>
                  </span>
                  <span className="ben-cell">
                    {person.district}
                    <span className="rp-cell-sub">{t('admin.staff.joined', { date: person.joinedLabel })}</span>
                  </span>
                  <span className="ben-cell">
                    {person.callsHandled}
                    <span className="rp-cell-sub">{t('admin.executives.reports', { count: person.reportsSent })}</span>
                  </span>
                  <span className="ben-cell">{person.transfersOut}</span>
                  <span className="ben-cell">
                    {person.avgHandleSeconds > 0 ? formatDuration(person.avgHandleSeconds) : t('common.none')}
                  </span>
                  <span className="ben-cell is-muted">{person.lastActiveLabel}</span>
                  <span className="admin-row-actions">
                    <span className={person.active ? 'chip is-teal' : 'chip is-bright'}>
                      {person.active ? t('admin.staff.active') : t('admin.staff.inactive')}
                    </span>
                    <button type="button" className="link-button" onClick={() => toggleActive(person.userId)}>
                      {person.active ? t('admin.staff.deactivate') : t('admin.staff.reactivate')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="call-queue-foot">
            <span>{t('common.showing', { from: 1, to: visible.length, total: staff.length })}</span>
            <span className="call-queue-ticking">{t('admin.staff.foot')}</span>
          </div>
        </div>
      </div>

      {adding && (
        <div className="rp-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.executives.add')}>
          <div className="rp-modal">
            <header className="rp-modal-head">
              <div>
                <span className="journey-eyebrow">{t('admin.staff.newAccount')}</span>
                <h2>{t('admin.executives.add')}</h2>
              </div>
              <button type="button" className="journey-close" onClick={() => setAdding(false)} aria-label={t('common.close')}>
                ✕
              </button>
            </header>
            <div className="rp-modal-body">
              <p className="rp-hint">{t('admin.staff.addHint')}</p>
              <label className="call-field">
                <span>{t('admin.staff.headers.name')}</span>
                <input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="call-field">
                <span>{t('admin.staff.email')}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label className="call-field">
                <span>{t('admin.staff.headers.district')}</span>
                <select value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}>
                  {districts().map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {error && (
                <p className="rp-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className="rp-modal-foot">
              <button type="button" className="btn btn-outline btn-small" onClick={() => setAdding(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={submit}>
                {t('admin.staff.create')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
