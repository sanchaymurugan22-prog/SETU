import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  blocks,
  courses,
  districts,
  isFlaggedOrStalled,
  loadBeneficiaries,
  STATUS_ORDER,
  STATUS_TONE,
  type Beneficiary,
  type BeneficiaryStatus,
} from '../../data/jharkhandBeneficiaries'
import { formatLastContact } from '../../i18n/format'
import { BeneficiaryJourney } from './BeneficiaryJourney'
import '../../styles/beneficiaries.css'

const PAGE_SIZE = 12

type StatusFilter = 'all' | BeneficiaryStatus

function matchesSearch(person: Beneficiary, term: string): boolean {
  if (!term) return true
  const needle = term.trim().toLowerCase()
  return (
    person.name.toLowerCase().includes(needle) ||
    person.beneficiaryId.toLowerCase().includes(needle) ||
    person.primaryNumber.replace(/\s/g, '').includes(needle.replace(/\s/g, '')) ||
    person.village.toLowerCase().includes(needle)
  )
}

export function BeneficiariesSection() {
  const { t } = useTranslation()
  const all = loadBeneficiaries()

  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('all')
  const [block, setBlock] = useState('all')
  const [course, setCourse] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ person: Beneficiary; action: 'call' | 'officer' } | null>(null)

  const title = t('sections.admin.beneficiaries.title')

  useEffect(() => {
    document.title = `${title} · SETU`
  }, [title])

  const blockOptions = useMemo(() => blocks(district), [district])

  // A block left over from another district must not keep filtering everything out.
  // Derived rather than stored, so there is no second render to correct it.
  const effectiveBlock = block !== 'all' && !blockOptions.includes(block) ? 'all' : block

  // Any filter change puts us back on page 1. Adjusting state during render is React's
  // documented pattern for this and avoids the cascading render an effect would cause.
  const filterKey = `${search}|${district}|${effectiveBlock}|${course}|${status}|${flaggedOnly}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const scoped = useMemo(
    () =>
      all.filter(
        (person) =>
          matchesSearch(person, search) &&
          (district === 'all' || person.district === district) &&
          (effectiveBlock === 'all' || person.block === effectiveBlock) &&
          (course === 'all' || person.course === course) &&
          (!flaggedOnly || isFlaggedOrStalled(person)),
      ),
    [all, search, district, effectiveBlock, course, flaggedOnly],
  )

  // Status counts reflect every other filter, so the chips always add up to what you see.
  const statusCounts = useMemo(() => {
    const counts = new Map<BeneficiaryStatus, number>()
    for (const person of scoped) counts.set(person.status, (counts.get(person.status) ?? 0) + 1)
    return counts
  }, [scoped])

  const filtered = useMemo(
    () => (status === 'all' ? scoped : scoped.filter((person) => person.status === status)),
    [scoped, status],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = selectedId ? (all.find((person) => person.beneficiaryId === selectedId) ?? null) : null
  const flaggedCount = all.filter(isFlaggedOrStalled).length

  return (
    <>
      <header className="section-header ben-header">
        <div>
          <h1>{title}</h1>
          <p className="ben-subtitle">{t('beneficiaries.subtitle', { total: all.length, flagged: flaggedCount })}</p>
        </div>
        <div className="ben-jurisdiction">
          <span className="ben-jurisdiction-label">{t('gapMap.jurisdictionLabel')}</span>
          <span className="ben-jurisdiction-value">{t('gapMap.jurisdictionValue')}</span>
        </div>
      </header>

      <div className="section-body ben-body">
        <div className="ben-filters">
          <label className="ben-search">
            <span className="visually-hidden">{t('beneficiaries.searchLabel')}</span>
            <input
              type="search"
              value={search}
              placeholder={t('beneficiaries.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="ben-select">
            <span className="visually-hidden">{t('beneficiaries.filters.district')}</span>
            <select value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="all">{t('beneficiaries.filters.districtAll')}</option>
              {districts().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="ben-select">
            <span className="visually-hidden">{t('beneficiaries.filters.block')}</span>
            <select value={effectiveBlock} onChange={(event) => setBlock(event.target.value)}>
              <option value="all">{t('beneficiaries.filters.blockAll')}</option>
              {blockOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="ben-select">
            <span className="visually-hidden">{t('beneficiaries.filters.course')}</span>
            <select value={course} onChange={(event) => setCourse(event.target.value)}>
              <option value="all">{t('beneficiaries.filters.courseAll')}</option>
              {courses().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="ben-select">
            <span className="visually-hidden">{t('beneficiaries.filters.status')}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">{t('beneficiaries.filters.statusAll')}</option>
              {STATUS_ORDER.map((name) => (
                <option key={name} value={name}>
                  {t(`status.${name}`)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={flaggedOnly ? 'ben-toggle is-on' : 'ben-toggle'}
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly((on) => !on)}
          >
            <span className="ben-toggle-switch" aria-hidden="true" />
            {t('beneficiaries.filters.flaggedOnly')}
            <span className="ben-toggle-count">{flaggedCount}</span>
          </button>
        </div>

        <div className="ben-status-row">
          <span className="ben-status-label">{t('beneficiaries.filters.status')}</span>
          <button
            type="button"
            className={status === 'all' ? 'ben-chip is-selected' : 'ben-chip'}
            onClick={() => setStatus('all')}
          >
            {t('beneficiaries.chipAll', { count: scoped.length })}
          </button>
          {STATUS_ORDER.map((name) => (
            <button
              key={name}
              type="button"
              className={`ben-chip is-${STATUS_TONE[name]}${status === name ? ' is-selected' : ''}`}
              onClick={() => setStatus(status === name ? 'all' : name)}
            >
              {t('beneficiaries.chip', { label: t(`status.${name}`), count: statusCounts.get(name) ?? 0 })}
            </button>
          ))}
        </div>

        {notice && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">
              {notice.action === 'call'
                ? t('beneficiaries.journey.scheduleCall')
                : t('beneficiaries.journey.assignOfficer')}
            </span>
            <span>
              {t('beneficiaries.journey.notice', {
                name: notice.person.name,
                id: notice.person.beneficiaryId,
              })}
            </span>
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div className={selected ? 'ben-layout has-panel' : 'ben-layout'}>
          <section className="ben-table-panel" aria-label={t('beneficiaries.listAria')}>
            <div className="ben-table-head" aria-hidden="true">
              <span>{t('beneficiaries.headers.name')}</span>
              <span>{t('beneficiaries.headers.location')}</span>
              <span>{t('beneficiaries.headers.course')}</span>
              <span>{t('beneficiaries.headers.status')}</span>
              <span>{t('beneficiaries.headers.lastContact')}</span>
              <span>{t('beneficiaries.headers.flags')}</span>
            </div>

            {rows.length === 0 ? (
              <p className="ben-empty">{t('beneficiaries.empty')}</p>
            ) : (
              <ul className="ben-rows">
                {rows.map((person) => (
                  <li key={person.beneficiaryId}>
                    <button
                      type="button"
                      className={selectedId === person.beneficiaryId ? 'ben-row is-selected' : 'ben-row'}
                      onClick={() =>
                        setSelectedId(selectedId === person.beneficiaryId ? null : person.beneficiaryId)
                      }
                    >
                      <span className="ben-cell-name">
                        <span className="ben-name">{person.name}</span>
                        <span className="ben-id">
                          {person.beneficiaryId} · {person.age} {person.gender}
                        </span>
                      </span>
                      <span className="ben-cell">
                        {person.district} · {person.block} · {person.village}
                      </span>
                      <span className="ben-cell">{person.course}</span>
                      <span className="ben-cell">
                        <span className={`chip is-${STATUS_TONE[person.status]}`}>{t(`status.${person.status}`)}</span>
                      </span>
                      <span className="ben-cell is-muted">{formatLastContact(t, person.lastContactDays)}</span>
                      <span className="ben-cell">
                        {person.aiFlags.length > 0 ? (
                          <span className="chip is-flag">
                            {t('beneficiaries.flagsAi', { count: person.aiFlags.length })}
                          </span>
                        ) : person.isStalled ? (
                          <span className="chip is-stalled">{t('beneficiaries.flagsStalled')}</span>
                        ) : (
                          <span className="is-muted">{t('common.none')}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="ben-pagination">
              <span className="ben-count">
                {filtered.length === 0
                  ? t('common.noResults')
                  : t('common.showing', {
                      from: (currentPage - 1) * PAGE_SIZE + 1,
                      to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                      total: filtered.length,
                    })}
                {filtered.length !== all.length && ` · ${t('common.totalSuffix', { total: all.length })}`}
              </span>
              <div className="ben-pages">
                <button
                  type="button"
                  className="ben-page"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  {t('common.prev')}
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                  <button
                    key={number}
                    type="button"
                    className={number === currentPage ? 'ben-page is-current' : 'ben-page'}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  className="ben-page"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          </section>

          {selected && (
            <BeneficiaryJourney
              person={selected}
              onClose={() => setSelectedId(null)}
              onAction={(person, action) => setNotice({ person, action })}
            />
          )}
        </div>
      </div>
    </>
  )
}
