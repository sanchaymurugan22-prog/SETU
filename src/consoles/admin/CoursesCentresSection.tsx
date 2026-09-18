import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  allotmentSuggestions,
  loadCentres,
  loadCourses,
  loadResourcePersonRecords,
  waitingInBlock,
  type Centre,
} from '../../data/adminConsole'
import { districts } from '../../data/jharkhandBeneficiaries'
import { addCentre as writeCentre, addCourse as writeCourse, allotToCentre, slug } from '../../data/actions'
import { useAction } from '../../data/useAction'
import { useDataSource } from '../../data/useDataSource'
import { SourceBadge } from './SourceBadge'
import { WriteError } from './WriteError'
import '../../styles/admin.css'

type Tab = 'courses' | 'centres' | 'allotment'

/** Courses, centres, seat counts and the auto-allotment queue (SETU-SPEC 6.6). */
export function CoursesCentresSection() {
  const { t } = useTranslation()
  const source = useDataSource('centres')
  const action = useAction()
  const staff = loadResourcePersonRecords()
  const courseRecords = loadCourses()
  const centres = loadCentres()
  const [tab, setTab] = useState<Tab>('courses')
  const [adding, setAdding] = useState<'course' | 'centre' | null>(null)
  const [courseForm, setCourseForm] = useState({ name: '', level: '3' })
  const [centreForm, setCentreForm] = useState({
    name: '',
    district: districts()[0] ?? '',
    block: '',
    capacity: '20',
    course: courseRecords[0]?.course ?? '',
    resourcePersonId: staff[0]?.userId ?? '',
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const title = t('sections.admin.courses-centres.title')
  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const suggestions = allotmentSuggestions()
  const totalWaiting = courseRecords.reduce((sum, record) => sum + record.waiting, 0)
  const totalSeats = centres.reduce((sum, centre) => sum + centre.capacity, 0)
  const totalAllotted = centres.reduce((sum, centre) => sum + centre.allotted, 0)

  const addCourse = async () => {
    const name = courseForm.name.trim()
    if (!name) {
      setError(t('admin.coursesCentres.courseError'))
      return
    }
    setError(null)
    const ok = await action.run(() =>
      writeCourse({
        course: name,
        nsqfLevel: Number(courseForm.level) || 3,
        jobRole: '',
        minimumClass: 0,
        needsLiteracy: false,
        homeBased: false,
        needsSmartphone: false,
        durationWeeks: 0,
        whatYouLearn: '',
        toolsUsed: '',
        typicalWork: '',
        // Not a guess. Part 4 of the conversation script: the assistant never invents an
        // earning figure, so a course filed without one has none until somebody fills it in.
        earningRange: null,
        feeNote: '',
      }),
    )
    if (!ok) return
    setNotice(t('admin.coursesCentres.courseAdded', { course: name }))
    setCourseForm({ name: '', level: '3' })
    setAdding(null)
  }

  const addCentre = async () => {
    if (!centreForm.name.trim() || !centreForm.block.trim()) {
      setError(t('admin.coursesCentres.centreError'))
      return
    }
    const expert = staff.find((person) => person.userId === centreForm.resourcePersonId)
    const capacity = Number(centreForm.capacity) || 20
    // Spec 6.6: a new centre absorbs the block's waiting list, up to its capacity. The
    // people are named rather than counted, because allotment writes to their records.
    const waiting = waitingInBlock(centreForm.block, centreForm.course)
    const seated = waiting.slice(0, capacity)
    const created: Centre = {
      centreId: `centre-${slug(`${centreForm.block}-${centreForm.name}`)}`,
      name: centreForm.name.trim(),
      district: centreForm.district,
      block: centreForm.block.trim(),
      courses: [centreForm.course],
      capacity,
      allotted: seated.length,
      waiting: Math.max(0, waiting.length - seated.length),
      resourcePersonId: expert?.userId ?? null,
      resourcePersonName: expert?.name ?? null,
      openedLabel: t('admin.staff.joinedToday'),
    }
    setError(null)
    // The centre first: the allotment updates its seat counts, so it has to exist.
    const madeCentre = await action.run(() => writeCentre(created))
    if (!madeCentre) return
    if (seated.length > 0) {
      const allotted = await action.run(() =>
        allotToCentre({ ...created, allotted: 0, waiting: waiting.length }, seated),
      )
      if (!allotted) return
    }
    setNotice(
      seated.length > 0
        ? t('admin.coursesCentres.centreAddedWithAllotment', {
            centre: created.name,
            count: seated.length,
            trainer: created.resourcePersonName ?? t('common.none'),
          })
        : t('admin.coursesCentres.centreAdded', { centre: created.name }),
    )
    setCentreForm({ ...centreForm, name: '', block: '' })
    setAdding(null)
    setTab('centres')
  }

  return (
    <>
      <header className="section-header admin-header">
        <div>
          <h1>{title}</h1>
          <p className="call-subtitle">
            {t('admin.coursesCentres.subtitle', {
              courses: courseRecords.length,
              centres: centres.length,
              waiting: totalWaiting,
            })}
          </p>
        </div>
        <div className="admin-header-actions">
          <SourceBadge state={source} count={centres.length} />
          <button type="button" className="btn btn-outline btn-small" onClick={() => setAdding('course')}>
            {t('admin.coursesCentres.addCourse')}
          </button>
          <button type="button" className="btn btn-primary btn-small" onClick={() => setAdding('centre')}>
            {t('admin.coursesCentres.addCentre')}
          </button>
        </div>
      </header>

      <div className="section-body admin-body">
        <WriteError error={action.error} onDismiss={action.clear} />

        {notice && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">{t('admin.coursesCentres.noticeTitle')}</span>
            <span>{notice}</span>
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div className="admin-stat-row">
          <article className="gap-card">
            <span className="gap-card-label">{t('admin.coursesCentres.cards.seatsLabel')}</span>
            <span className="gap-card-value">{totalSeats}</span>
            <span className="gap-card-foot">
              {t('admin.coursesCentres.cards.seatsFoot', { allotted: totalAllotted })}
            </span>
          </article>
          <article className="gap-card">
            <span className="gap-card-label">{t('admin.coursesCentres.cards.fillLabel')}</span>
            <span className="gap-card-value">
              {Math.round((totalAllotted / Math.max(1, totalSeats)) * 100)}
              <span className="gap-card-unit">%</span>
            </span>
            <span className="gap-card-foot">{t('admin.coursesCentres.cards.fillFoot')}</span>
          </article>
          <article className="gap-card is-alert">
            <span className="gap-card-label">{t('admin.coursesCentres.cards.waitingLabel')}</span>
            <span className="gap-card-value is-alert">{totalWaiting}</span>
            <span className="gap-card-foot">
              {t('admin.coursesCentres.cards.waitingFoot', { blocks: suggestions.length })}
            </span>
          </article>
        </div>

        <div className="admin-tabs" role="tablist">
          {(['courses', 'centres', 'allotment'] as Tab[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              className={tab === option ? 'admin-tab is-active' : 'admin-tab'}
              onClick={() => setTab(option)}
            >
              {t(`admin.coursesCentres.tab.${option}`)}
            </button>
          ))}
        </div>

        {tab === 'courses' && (
          <div className="admin-panel">
            <div className="admin-table-head admin-course-grid" aria-hidden="true">
              <span>{t('admin.coursesCentres.headers.course')}</span>
              <span>{t('admin.coursesCentres.headers.nsqf')}</span>
              <span>{t('admin.coursesCentres.headers.centres')}</span>
              <span>{t('admin.coursesCentres.headers.enrolled')}</span>
              <span>{t('admin.coursesCentres.headers.allotted')}</span>
              <span>{t('admin.coursesCentres.headers.waiting')}</span>
            </div>
            <ul className="admin-rows">
              {courseRecords.map((record) => (
                <li className="admin-row admin-course-grid" key={record.course}>
                  <span className="ben-cell-name">
                    <span className="ben-name">{record.course}</span>
                    {record.demandBlocks > 0 && (
                      <span className="ben-id">
                        {t('admin.coursesCentres.demandBlocks', { count: record.demandBlocks })}
                      </span>
                    )}
                  </span>
                  <span className="ben-cell">{t('certificate.nsqf', { level: record.nsqfLevel })}</span>
                  <span className="ben-cell">{record.centres}</span>
                  <span className="ben-cell">{record.enrolled}</span>
                  <span className="ben-cell">{record.allotted}</span>
                  <span className="ben-cell">
                    {record.waiting > 0 ? (
                      <span className="chip is-magenta">{record.waiting}</span>
                    ) : (
                      <span className="is-muted">{t('common.none')}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'centres' && (
          <div className="admin-panel">
            <div className="admin-table-head admin-centre-grid" aria-hidden="true">
              <span>{t('admin.coursesCentres.headers.centre')}</span>
              <span>{t('admin.coursesCentres.headers.courses')}</span>
              <span>{t('admin.coursesCentres.headers.seats')}</span>
              <span>{t('admin.coursesCentres.headers.waiting')}</span>
              <span>{t('admin.coursesCentres.headers.trainer')}</span>
            </div>
            <ul className="admin-rows">
              {centres.map((centre) => {
                const fill = Math.round((centre.allotted / Math.max(1, centre.capacity)) * 100)
                return (
                  <li className="admin-row admin-centre-grid" key={centre.centreId}>
                    <span className="ben-cell-name">
                      <span className="ben-name">{centre.name}</span>
                      <span className="ben-id">
                        {centre.block} · {centre.district} · {t('admin.coursesCentres.opened', { date: centre.openedLabel })}
                      </span>
                    </span>
                    <span className="ben-cell">
                      {centre.courses.map((course) => (
                        <span className="chip is-neutral admin-course-chip" key={course}>
                          {course}
                        </span>
                      ))}
                    </span>
                    <span className="ben-cell">
                      {centre.allotted} / {centre.capacity}
                      <span className="gap-bar admin-fill">
                        <span style={{ width: `${Math.min(100, fill)}%` }} />
                      </span>
                    </span>
                    <span className="ben-cell">
                      {centre.waiting > 0 ? (
                        <span className="chip is-magenta">{centre.waiting}</span>
                      ) : (
                        <span className="is-muted">{t('common.none')}</span>
                      )}
                    </span>
                    <span className="ben-cell">
                      {centre.resourcePersonName ?? (
                        <span className="is-muted">{t('admin.coursesCentres.noTrainer')}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'allotment' && (
          <div className="admin-panel">
            <p className="admin-panel-note">{t('admin.coursesCentres.allotmentNote')}</p>
            <div className="admin-table-head admin-allotment-grid" aria-hidden="true">
              <span>{t('admin.coursesCentres.headers.block')}</span>
              <span>{t('admin.coursesCentres.headers.course')}</span>
              <span>{t('admin.coursesCentres.headers.demand')}</span>
              <span>{t('admin.coursesCentres.headers.nearest')}</span>
              <span />
            </div>
            <ul className="admin-rows">
              {suggestions.map((entry) => (
                <li className="admin-row admin-allotment-grid" key={`${entry.block}-${entry.course}`}>
                  <span className="ben-cell-name">
                    <span className="ben-name">{entry.block}</span>
                    <span className="ben-id">{entry.district}</span>
                  </span>
                  <span className="ben-cell">{entry.course}</span>
                  <span className="ben-cell">
                    <span className="admin-count">{entry.demand}</span>
                  </span>
                  <span className="ben-cell">
                    {entry.nearestCentreKm === null
                      ? t('admin.coursesCentres.noNearest')
                      : t('gapMap.popup.km', { km: entry.nearestCentreKm })}
                    {entry.centresFull && (
                      <span className="rp-cell-sub">{t('admin.coursesCentres.centresFull')}</span>
                    )}
                  </span>
                  <span className="admin-row-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() => {
                        setCentreForm({
                          ...centreForm,
                          block: entry.block,
                          district: entry.district,
                          course: entry.course,
                          name: t('admin.coursesCentres.suggestedName', { block: entry.block }),
                        })
                        setAdding('centre')
                      }}
                    >
                      {t('admin.coursesCentres.openCentre')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {adding && (
        <div className="rp-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.coursesCentres.addCentre')}>
          <div className="rp-modal">
            <header className="rp-modal-head">
              <div>
                <span className="journey-eyebrow">{t('admin.coursesCentres.noticeTitle')}</span>
                <h2>{adding === 'course' ? t('admin.coursesCentres.addCourse') : t('admin.coursesCentres.addCentre')}</h2>
              </div>
              <button type="button" className="journey-close" onClick={() => setAdding(null)} aria-label={t('common.close')}>
                ✕
              </button>
            </header>

            <div className="rp-modal-body">
              {adding === 'course' ? (
                <>
                  <label className="call-field">
                    <span>{t('admin.coursesCentres.headers.course')}</span>
                    <input
                      type="text"
                      value={courseForm.name}
                      onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })}
                    />
                  </label>
                  <label className="call-field">
                    <span>{t('admin.coursesCentres.headers.nsqf')}</span>
                    <select
                      value={courseForm.level}
                      onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value })}
                    >
                      {['1', '2', '3', '4', '5'].map((level) => (
                        <option key={level} value={level}>
                          {t('certificate.nsqf', { level })}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <p className="rp-hint">{t('admin.coursesCentres.centreHint')}</p>
                  <label className="call-field">
                    <span>{t('admin.coursesCentres.headers.centre')}</span>
                    <input
                      type="text"
                      value={centreForm.name}
                      onChange={(event) => setCentreForm({ ...centreForm, name: event.target.value })}
                    />
                  </label>
                  <div className="rp-time-row">
                    <label className="call-field">
                      <span>{t('beneficiaries.filters.district')}</span>
                      <select
                        value={centreForm.district}
                        onChange={(event) => setCentreForm({ ...centreForm, district: event.target.value })}
                      >
                        {districts().map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="call-field">
                      <span>{t('beneficiaries.filters.block')}</span>
                      <input
                        type="text"
                        value={centreForm.block}
                        onChange={(event) => setCentreForm({ ...centreForm, block: event.target.value })}
                      />
                    </label>
                    <label className="call-field">
                      <span>{t('admin.coursesCentres.capacity')}</span>
                      <input
                        type="number"
                        min="1"
                        value={centreForm.capacity}
                        onChange={(event) => setCentreForm({ ...centreForm, capacity: event.target.value })}
                      />
                    </label>
                  </div>
                  <label className="call-field">
                    <span>{t('admin.coursesCentres.headers.course')}</span>
                    <select
                      value={centreForm.course}
                      onChange={(event) => setCentreForm({ ...centreForm, course: event.target.value })}
                    >
                      {courseRecords.map((record) => (
                        <option key={record.course} value={record.course}>
                          {record.course}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="call-field">
                    <span>{t('admin.coursesCentres.headers.trainer')}</span>
                    <select
                      value={centreForm.resourcePersonId}
                      onChange={(event) => setCentreForm({ ...centreForm, resourcePersonId: event.target.value })}
                    >
                      {staff.map((person) => (
                        <option key={person.userId} value={person.userId}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {error && (
                <p className="rp-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <footer className="rp-modal-foot">
              <button type="button" className="btn btn-outline btn-small" onClick={() => setAdding(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-small"
                disabled={action.pending}
                onClick={() => void (adding === 'course' ? addCourse() : addCentre())}
              >
                {action.pending
                  ? t('writes.saving')
                  : adding === 'course'
                    ? t('admin.coursesCentres.addCourse')
                    : t('admin.coursesCentres.addCentre')}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
