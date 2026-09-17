import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadCentres, RESOURCE_PERSON_RECORDS, type ResourcePersonRecord } from '../../data/adminConsole'
import { courses, districts } from '../../data/jharkhandBeneficiaries'
import '../../styles/admin.css'

/** All resource persons, their postings, and the courses they are assigned (SETU-SPEC 6.3). */
export function ResourcePersonsSection() {
  const { t } = useTranslation()
  const centres = loadCentres()
  const [staff, setStaff] = useState<ResourcePersonRecord[]>(RESOURCE_PERSON_RECORDS)
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
  }, [search, staff])

  const trainees = staff.reduce((sum, person) => sum + person.traineeCount, 0)

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError(t('admin.staff.addError'))
      return
    }
    const centre = centres.find((entry) => entry.name === form.centre)
    const created: ResourcePersonRecord = {
      userId: `rp-new-${staff.length + 1}`,
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
    setStaff((current) => [created, ...current])
    setNotice(t('admin.staff.created', { name: created.name }))
    setError(null)
    setAdding(false)
    setForm({ name: '', email: '', district: districts()[0] ?? '', centre: centres[0]?.name ?? '' })
  }

  const toggleCourse = (userId: string, course: string) =>
    setStaff((current) =>
      current.map((person) =>
        person.userId === userId
          ? {
              ...person,
              courses: person.courses.includes(course)
                ? person.courses.filter((entry) => entry !== course)
                : [...person.courses, course],
            }
          : person,
      ),
    )

  const moveCentre = (userId: string, centreName: string) =>
    setStaff((current) =>
      current.map((person) => {
        if (person.userId !== userId) return person
        const centre = centres.find((entry) => entry.name === centreName)
        return {
          ...person,
          centre: centreName,
          district: centre?.district ?? person.district,
          block: centre?.block ?? person.block,
        }
      }),
    )

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
        <button type="button" className="btn btn-primary btn-small" onClick={() => setAdding(true)}>
          {t('admin.resourcePersons.add')}
        </button>
      </header>

      <div className="section-body admin-body">
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
                  <button type="button" className="btn btn-outline btn-small" onClick={() => setAssigning(person)}>
                    {t('admin.resourcePersons.assign')}
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
                <select value={open.centre} onChange={(event) => moveCentre(open.userId, event.target.value)}>
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
                      onClick={() => toggleCourse(open.userId, course)}
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
