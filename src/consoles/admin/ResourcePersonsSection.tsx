import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadCentres, loadResourcePersonRecords, type ResourcePersonRecord } from '../../data/adminConsole'
import { courses, districts } from '../../data/jharkhandBeneficiaries'
import { addStaff, assignResourcePerson, setStaffActive, slug } from '../../data/actions'
import { useAction } from '../../data/useAction'
import { useDataSource } from '../../data/useDataSource'
import { SeededDirectoryNote } from './SeededDirectoryNote'
import { SourceBadge } from './SourceBadge'
import { WriteError } from './WriteError'
import '../../styles/admin.css'

/** All resource persons, their postings, and the courses they are assigned (SETU-SPEC 6.3). */
export function ResourcePersonsSection() {
  const { t } = useTranslation()
  const source = useDataSource('staff')
  const action = useAction()
  const centres = loadCentres()
  const staff = loadResourcePersonRecords()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [assigning, setAssigning] = useState<ResourcePersonRecord | null>(null)
  const [form, setForm] = useState({ name: '', email: '', district: districts()[0] ?? '', centre: centres[0]?.name ?? '' })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const title = t('sections.admin.resource-persons.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return staff.filter(
      (person) =>
        !needle ||
        person.name.toLowerCase().includes(needle) ||
        person.centre.toLowerCase().includes(needle) ||
        person.courses.some((course) => course.toLowerCase().includes(needle)),
    )
    // loadResourcePersonRecords reads the module-level slot the linter cannot see change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, staff, source.loadedAt, source.items])

  const trainees = staff.reduce((sum, person) => sum + person.traineeCount, 0)

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError(t('admin.staff.addError'))
      return
    }
    const centre = centres.find((entry) => entry.name === form.centre)
    const created: ResourcePersonRecord = {
      userId: `rp-${slug(form.email.trim().split('@')[0] ?? form.name)}`,
      name: form.name.trim(),
      email: form.email.trim(),
      district: centre?.district ?? form.district,
      block: centre?.block ?? '—',
      centre: form.centre,
      courses: centre?.courses ?? [],
      active: true,
      joinedLabel: t('admin.staff.joinedToday'),
      traineeCount: 0,
      certifiedCount: 0,
      callsHandled: 0,
      lastActiveLabel: t('admin.staff.neverSignedIn'),
    }
    setError(null)
    const ok = await action.run(() => addStaff({ role: 'resourcePerson', ...created }))
    if (!ok) return
    setNotice(t('admin.staff.created', { name: created.name }))
    setAdding(false)
    setForm({ name: '', email: '', district: districts()[0] ?? '', centre: centres[0]?.name ?? '' })
  }

  /**
   * A posting is one write: the centre, the block it sits in, and the courses taught
   * there. The centre document records the trainer too, because that is what the
   * attendance rules read to decide whether they may mark a sheet at it.
   */
  const savePosting = (person: ResourcePersonRecord, centreName: string, courseList: string[]) => {
    const centre = centres.find((entry) => entry.name === centreName)
    return action.run(() =>
      assignResourcePerson(
        person.userId,
        {
          centre: centreName,
          centreId: centre?.centreId ?? null,
          district: centre?.district ?? person.district,
          block: centre?.block ?? person.block,
          courses: courseList,
        },
        person.name,
      ),
    )
  }

  const toggleCourse = (person: ResourcePersonRecord, course: string) =>
    void savePosting(
      person,
      person.centre,
      person.courses.includes(course)
        ? person.courses.filter((entry) => entry !== course)
        : [...person.courses, course],
    )

  const moveCentre = (person: ResourcePersonRecord, centreName: string) =>
    void savePosting(person, centreName, person.courses)

  const open = assigning ? (staff.find((person) => person.userId === assigning.userId) ?? null) : null

  return (
    <>
      <header className="section-header admin-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('admin.resourcePersons.subtitle', { count: staff.length, trainees, centres: centres.length })}
          </p>
        </div>
        <div className="admin-header-actions">
          <SourceBadge state={source} count={staff.length} />
          <button type="button" className="btn btn-primary btn-small" onClick={() => setAdding(true)}>
            {t('admin.resourcePersons.add')}
          </button>
        </div>
      </header>

      <div className="section-body admin-body">
        <SeededDirectoryNote />
        <WriteError error={action.error} onDismiss={action.clear} />

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
              placeholder={t('admin.resourcePersons.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="admin-panel">
          <div className="admin-table-head admin-rp-grid" aria-hidden="true">
            <span>{t('admin.staff.headers.name')}</span>
            <span>{t('admin.resourcePersons.headers.posting')}</span>
            <span>{t('admin.resourcePersons.headers.courses')}</span>
            <span>{t('admin.resourcePersons.headers.trainees')}</span>
            <span>{t('admin.resourcePersons.headers.calls')}</span>
            <span />
          </div>

          <ul className="admin-rows">
            {visible.map((person) => (
              <li className="admin-row admin-rp-grid" key={person.userId}>
                <span className="ben-cell-name">
                  <span className="ben-name">{person.name}</span>
                  <span className="ben-id">{person.email}</span>
                </span>
                <span className="ben-cell">
                  {person.centre}
                  <span className="rp-cell-sub">
                    {person.block} · {person.district}
                  </span>
                </span>
                <span className="ben-cell">
                  {person.courses.length === 0 ? (
                    <span className="is-muted">{t('admin.resourcePersons.noCourses')}</span>
                  ) : (
                    person.courses.map((course) => (
                      <span className="chip is-neutral admin-course-chip" key={course}>
                        {course}
                      </span>
                    ))
                  )}
                </span>
                <span className="ben-cell">
                  {person.traineeCount}
                  <span className="rp-cell-sub">
                    {t('admin.resourcePersons.certified', { count: person.certifiedCount })}
                  </span>
                </span>
                <span className="ben-cell">{person.callsHandled}</span>
                <span className="admin-row-actions">
                  <span className={person.active ? 'chip is-teal' : 'chip is-bright'}>
                    {person.active ? t('admin.staff.active') : t('admin.staff.inactive')}
                  </span>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => setAssigning(person)}>
                    {t('admin.resourcePersons.assign')}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    disabled={action.pending}
                    onClick={() => void action.run(() => setStaffActive(person.userId, !person.active))}
                  >
                    {person.active ? t('admin.staff.deactivate') : t('admin.staff.reactivate')}
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="call-queue-foot">
            <span>{t('common.showing', { from: 1, to: visible.length, total: staff.length })}</span>
            <span className="call-queue-ticking">{t('admin.resourcePersons.foot')}</span>
          </div>
        </div>
      </div>

      {open && (
        <div className="rp-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.resourcePersons.assign')}>
          <div className="rp-modal">
            <header className="rp-modal-head">
              <div>
                <span className="journey-eyebrow">{t('admin.resourcePersons.assign')}</span>
                <h2>{open.name}</h2>
              </div>
              <button type="button" className="journey-close" onClick={() => setAssigning(null)} aria-label={t('common.close')}>
                ✕
              </button>
            </header>
            <div className="rp-modal-body">
              <label className="call-field">
                <span>{t('admin.resourcePersons.centre')}</span>
                <select value={open.centre} onChange={(event) => moveCentre(open, event.target.value)}>
                  {centres.map((centre) => (
                    <option key={centre.centreId} value={centre.name}>
                      {centre.name} · {centre.block}
                    </option>
                  ))}
                </select>
              </label>

              <div className="call-field">
                <span>{t('admin.resourcePersons.headers.courses')}</span>
                <div className="admin-course-picker">
                  {courses().map((course) => (
                    <button
                      key={course}
                      type="button"
                      className={open.courses.includes(course) ? 'call-chip is-selected' : 'call-chip'}
                      aria-pressed={open.courses.includes(course)}
                      disabled={action.pending}
                      onClick={() => toggleCourse(open, course)}
                    >
                      {course}
                    </button>
                  ))}
                </div>
              </div>
              <p className="rp-hint">{t('admin.resourcePersons.assignHint')}</p>
            </div>
            <footer className="rp-modal-foot">
              <button type="button" className="btn btn-primary btn-small" onClick={() => setAssigning(null)}>
                {t('common.save')}
              </button>
            </footer>
          </div>
        </div>
      )}

      {adding && (
        <div className="rp-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.resourcePersons.add')}>
          <div className="rp-modal">
            <header className="rp-modal-head">
              <div>
                <span className="journey-eyebrow">{t('admin.staff.newAccount')}</span>
                <h2>{t('admin.resourcePersons.add')}</h2>
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
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className="call-field">
                <span>{t('admin.resourcePersons.centre')}</span>
                <select value={form.centre} onChange={(event) => setForm({ ...form, centre: event.target.value })}>
                  {centres.map((centre) => (
                    <option key={centre.centreId} value={centre.name}>
                      {centre.name} · {centre.block}
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
              <button type="button" className="btn btn-primary btn-small" disabled={action.pending} onClick={() => void submit()}>
                {action.pending ? t('writes.saving') : t('admin.staff.create')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
