import { useEffect, useMemo, useState } from 'react'
import {
  blocks,
  courses,
  districts,
  isFlaggedOrStalled,
  lastContactLabel,
  loadBeneficiaries,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  type Beneficiary,
  type BeneficiaryStatus,
} from '../../data/jharkhandBeneficiaries'
import { BeneficiaryJourney } from './BeneficiaryJourney'
import '../../styles/beneficiaries.css'

const PAGE_SIZE = 12

type StatusFilter = 'all' | BeneficiaryStatus

const ACTION_LABEL = { call: 'Schedule call', officer: 'Assign officer' } as const

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

  useEffect(() => {
    document.title = 'Beneficiaries · SETU'
  }, [])

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
          <h1>Beneficiaries</h1>
          <p className="ben-subtitle">
            {all.length} sample beneficiaries · {flaggedCount} AI-flagged or stalled · seeded from the gap-map blocks
          </p>
        </div>
        <div className="ben-jurisdiction">
          <span className="ben-jurisdiction-label">Jurisdiction</span>
          <span className="ben-jurisdiction-value">Jharkhand · all 24 districts</span>
        </div>
      </header>

      <div className="section-body ben-body">
        <div className="ben-filters">
          <label className="ben-search">
            <span className="visually-hidden">Search beneficiaries</span>
            <input
              type="search"
              value={search}
              placeholder="Search name, phone, village or SETU ID"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="ben-select">
            <span className="visually-hidden">District</span>
            <select value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="all">District: all</option>
              {districts().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="ben-select">
            <span className="visually-hidden">Block</span>
            <select value={effectiveBlock} onChange={(event) => setBlock(event.target.value)}>
              <option value="all">Block: all</option>
              {blockOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="ben-select">
            <span className="visually-hidden">Course</span>
            <select value={course} onChange={(event) => setCourse(event.target.value)}>
              <option value="all">Course: all</option>
              {courses().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="ben-select">
            <span className="visually-hidden">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">Status: all</option>
              {STATUS_ORDER.map((name) => (
                <option key={name} value={name}>
                  {STATUS_LABEL[name]}
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
            AI-flagged / stalled only
            <span className="ben-toggle-count">{flaggedCount}</span>
          </button>
        </div>

        <div className="ben-status-row">
          <span className="ben-status-label">Status</span>
          <button
            type="button"
            className={status === 'all' ? 'ben-chip is-selected' : 'ben-chip'}
            onClick={() => setStatus('all')}
          >
            All · {scoped.length}
          </button>
          {STATUS_ORDER.map((name) => (
            <button
              key={name}
              type="button"
              className={`ben-chip is-${STATUS_TONE[name]}${status === name ? ' is-selected' : ''}`}
              onClick={() => setStatus(status === name ? 'all' : name)}
            >
              {STATUS_LABEL[name]} · {statusCounts.get(name) ?? 0}
            </button>
          ))}
        </div>

        {notice && (
          <div className="gap-notice" role="status">
            <span className="gap-notice-action">{ACTION_LABEL[notice.action]}</span>
            <span>
              {notice.person.name} · {notice.person.beneficiaryId} — recorded in this session only. Scheduling and
              officer assignment arrive with the Admin Flags section.
            </span>
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className={selected ? 'ben-layout has-panel' : 'ben-layout'}>
          <section className="ben-table-panel" aria-label="Beneficiary list">
            <div className="ben-table-head" aria-hidden="true">
              <span>Name</span>
              <span>District · block · village</span>
              <span>Recommended course</span>
              <span>Status</span>
              <span>Last contact</span>
              <span>Flags</span>
            </div>

            {rows.length === 0 ? (
              <p className="ben-empty">No beneficiaries match these filters.</p>
            ) : (
              <ul className="ben-rows">
                {rows.map((person) => (
                  <li key={person.beneficiaryId}>
                    <button
                      type="button"
                      className={
                        selectedId === person.beneficiaryId ? 'ben-row is-selected' : 'ben-row'
                      }
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
                        <span className={`chip is-${STATUS_TONE[person.status]}`}>{STATUS_LABEL[person.status]}</span>
                      </span>
                      <span className="ben-cell is-muted">{lastContactLabel(person.lastContactDays)}</span>
                      <span className="ben-cell">
                        {person.aiFlags.length > 0 ? (
                          <span className="chip is-flag">AI · {person.aiFlags.length}</span>
                        ) : person.isStalled ? (
                          <span className="chip is-stalled">Stalled</span>
                        ) : (
                          <span className="is-muted">—</span>
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
                  ? 'No results'
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                {filtered.length !== all.length && ` · ${all.length} total`}
              </span>
              <div className="ben-pages">
                <button
                  type="button"
                  className="ben-page"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Prev
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
                  Next
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
