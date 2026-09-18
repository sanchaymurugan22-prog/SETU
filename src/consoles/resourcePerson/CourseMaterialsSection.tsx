import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DOCUMENT_TYPES,
  documentTypeFor,
  formatFileSize,
  RESOURCE_PERSON,
  type CourseMaterial,
  type DocumentType,
} from '../../data/resourcePerson'
import { WriteError } from '../admin/WriteError'
import { useTrainer } from './TrainerContext'
import { useDataSource } from '../../data/useDataSource'
import { SourceBadge } from '../admin/SourceBadge'
import '../../styles/resource-person.css'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** Schedule and timings — which decide when attendance opens — plus location and materials. */
export function CourseMaterialsSection() {
  const { t } = useTranslation()
  const source = useDataSource('courses')
  const {
    batches,
    openSession,
    nextSession,
    updateSchedule,
    addMaterial,
    removeMaterial,
    writeError,
    clearWriteError,
  } = useTrainer()
  const [draftFor, setDraftFor] = useState<string | null>(null)
  const [kind, setKind] = useState<CourseMaterial['kind']>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('pdf')
  const [attached, setAttached] = useState<{ name: string; size: number; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const heading = t('sections.resourcePerson.materials.title')
  useEffect(() => {
    document.title = `${heading} · SETU`
  }, [heading])

  const reset = () => {
    setTitle('')
    setBody('')
    setAttached(null)
    setDocumentType('pdf')
    setError(null)
    setDraftFor(null)
  }

  /**
   * A demo attachment never leaves the browser: Firebase Storage needs the paid plan, so
   * the bytes are kept as an object URL for this session and the entry says so.
   */
  const attach = (file: File | undefined) => {
    if (!file) return
    setAttached({ name: file.name, size: file.size, url: URL.createObjectURL(file) })
    setDocumentType(documentTypeFor(file.name))
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  const submit = (batchId: string) => {
    if (kind === 'document') {
      if (!title.trim() || (!body.trim() && !attached)) {
        setError(t('resourcePerson.materials.documentError'))
        return
      }
      addMaterial(batchId, {
        kind: 'document',
        title: title.trim(),
        body: attached ? attached.url : body.trim(),
        documentType: attached && documentTypeFor(attached.name) !== 'other'
          ? documentTypeFor(attached.name)
          : documentType,
        fileName: attached?.name ?? undefined,
        fileSize: attached?.size ?? undefined,
        source: attached ? 'demo-upload' : 'link',
      })
      reset()
      return
    }

    if (!title.trim() || !body.trim()) {
      setError(t('resourcePerson.materials.addError'))
      return
    }
    addMaterial(batchId, { kind, title: title.trim(), body: body.trim() })
    reset()
  }

  return (
    <>
      <header className="section-header rp-header">
        <div>
          <h1>{heading}</h1>
          <p className="call-subtitle">{t('resourcePerson.materials.subtitle', { count: batches.length })}</p>
        </div>
        <div className="rp-header-side">
          <span className="call-scope-label">{t('resourcePerson.centreLabel')}</span>
          <span className="call-scope-value">
            {RESOURCE_PERSON.name} · {batches[0]?.centre}
          </span>
        </div>
          <SourceBadge state={source} count={batches.length} />
      </header>

      <div className="section-body rp-body">
        <WriteError error={writeError} onDismiss={clearWriteError} />

        <div className={openSession ? 'rp-session is-open' : 'rp-session'} role="status">
          <span className="rp-session-dot" aria-hidden="true" />
          <span>
            {openSession
              ? t('resourcePerson.attendance.open', {
                  course: openSession.course,
                  from: openSession.startTime,
                  to: openSession.endTime,
                })
              : nextSession
                ? t('resourcePerson.attendance.closed', {
                    day: t(`resourcePerson.days.${DAY_KEYS[nextSession.window.dayIndex]}`),
                    from: nextSession.window.startTime,
                    course: nextSession.window.course,
                  })
                : t('resourcePerson.attendance.noSessions')}
          </span>
          <span className="rp-session-note">{t('resourcePerson.materials.scheduleDrivesAttendance')}</span>
        </div>

        <div className="rp-batches">
          {batches.map((batch) => (
            <article className="rp-batch" key={batch.batchId}>
              <header className="rp-batch-head">
                <div>
                  <span className="journey-eyebrow">{batch.batchId}</span>
                  <h2>{batch.course}</h2>
                  <span className="rp-cell-sub">
                    {batch.centre} · {batch.block}, {batch.district}
                  </span>
                </div>
                <span className={`chip is-${batch.schedule.mode === 'online' ? 'cyan' : 'neutral'}`}>
                  {t(`resourcePerson.materials.mode.${batch.schedule.mode}`)}
                </span>
              </header>

              <section className="rp-schedule" aria-label={t('resourcePerson.materials.scheduleTitle')}>
                <span className="rp-block-title">{t('resourcePerson.materials.scheduleTitle')}</span>

                <div className="rp-days">
                  {DAY_KEYS.map((key, index) => {
                    const on = batch.schedule.days.includes(index)
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        className={on ? 'rp-day is-on' : 'rp-day'}
                        onClick={() =>
                          updateSchedule(batch.batchId, {
                            days: on
                              ? batch.schedule.days.filter((day) => day !== index)
                              : [...batch.schedule.days, index].sort((a, b) => a - b),
                          })
                        }
                      >
                        {t(`resourcePerson.days.${key}`)}
                      </button>
                    )
                  })}
                </div>

                <div className="rp-time-row">
                  <label className="call-field">
                    <span>{t('resourcePerson.materials.startTime')}</span>
                    <input
                      type="time"
                      value={batch.schedule.startTime}
                      onChange={(event) => updateSchedule(batch.batchId, { startTime: event.target.value })}
                    />
                  </label>
                  <label className="call-field">
                    <span>{t('resourcePerson.materials.endTime')}</span>
                    <input
                      type="time"
                      value={batch.schedule.endTime}
                      onChange={(event) => updateSchedule(batch.batchId, { endTime: event.target.value })}
                    />
                  </label>
                  <label className="call-field">
                    <span>{t('resourcePerson.materials.modeLabel')}</span>
                    <select
                      value={batch.schedule.mode}
                      onChange={(event) =>
                        updateSchedule(batch.batchId, {
                          mode: event.target.value as typeof batch.schedule.mode,
                        })
                      }
                    >
                      {(['in-person', 'online', 'hybrid'] as const).map((mode) => (
                        <option key={mode} value={mode}>
                          {t(`resourcePerson.materials.mode.${mode}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="call-field">
                  <span>{t('resourcePerson.materials.location')}</span>
                  <input
                    type="text"
                    value={batch.schedule.location}
                    onChange={(event) => updateSchedule(batch.batchId, { location: event.target.value })}
                  />
                </label>

                <label className="call-field">
                  <span>{t('resourcePerson.materials.onlineLink')}</span>
                  <input
                    type="url"
                    value={batch.schedule.onlineLink ?? ''}
                    placeholder={t('resourcePerson.materials.onlineLinkPlaceholder')}
                    onChange={(event) =>
                      updateSchedule(batch.batchId, { onlineLink: event.target.value.trim() || null })
                    }
                  />
                </label>
              </section>

              <section className="rp-materials" aria-label={t('resourcePerson.materials.materialsTitle')}>
                <span className="rp-block-title">
                  {t('resourcePerson.materials.materialsTitle')} · {batch.materials.length}
                </span>

                <ul className="rp-material-list">
                  {batch.materials.map((material) => (
                    <li className="rp-material" key={material.id}>
                      <span
                        className={
                          material.kind === 'document'
                            ? `rp-material-kind is-doc-${material.documentType ?? 'other'}`
                            : `rp-material-kind is-${material.kind}`
                        }
                      >
                        {material.kind === 'document'
                          ? t(`resourcePerson.materials.documentType.${material.documentType ?? 'other'}`)
                          : t(`resourcePerson.materials.kind.${material.kind}`)}
                      </span>
                      <span className="rp-material-text">
                        <span className="rp-material-title">{material.title}</span>
                        {material.kind === 'note' && <span className="rp-material-body">{material.body}</span>}
                        {material.kind === 'link' && (
                          <a className="rp-material-link" href={material.body} target="_blank" rel="noreferrer">
                            {material.body}
                          </a>
                        )}
                        {material.kind === 'document' && (
                          <>
                            <span className="rp-material-file">
                              {material.fileName ?? material.body}
                              {formatFileSize(material.fileSize) && (
                                <span className="rp-material-size"> · {formatFileSize(material.fileSize)}</span>
                              )}
                            </span>
                            {material.source === 'demo-upload' ? (
                              <span className="rp-material-demo">{t('resourcePerson.materials.demoOnly')}</span>
                            ) : (
                              <a className="rp-material-link" href={material.body} target="_blank" rel="noreferrer">
                                {t('resourcePerson.materials.openDocument')}
                              </a>
                            )}
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => removeMaterial(batch.batchId, material.id)}
                      >
                        {t('resourcePerson.materials.remove')}
                      </button>
                    </li>
                  ))}
                </ul>

                {draftFor === batch.batchId ? (
                  <div className="rp-material-form">
                    <div className="rp-kind-row">
                      {(['note', 'link', 'document'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={kind === option ? 'call-chip is-selected' : 'call-chip'}
                          onClick={() => setKind(option)}
                        >
                          {t(`resourcePerson.materials.kind.${option}`)}
                        </button>
                      ))}
                    </div>
                    <label className="call-field">
                      <span>{t('resourcePerson.materials.materialTitle')}</span>
                      <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
                    </label>
                    {kind === 'document' ? (
                      <div className="rp-document-fields">
                        <p className="rp-hint">{t('resourcePerson.materials.documentHint')}</p>

                        <label className="call-field">
                          <span>{t('resourcePerson.materials.documentUrl')}</span>
                          <input
                            type="url"
                            value={body}
                            placeholder={t('resourcePerson.materials.documentUrlPlaceholder')}
                            onChange={(event) => {
                              setBody(event.target.value)
                              // Only override the trainer's choice when the link actually
                              // says what it is — a Drive /file/d/ link says nothing.
                              const guess = documentTypeFor(event.target.value)
                              if (guess !== 'other') setDocumentType(guess)
                            }}
                          />
                        </label>

                        <label className="call-field">
                          <span>{t('resourcePerson.materials.documentTypeLabel')}</span>
                          <select
                            value={documentType}
                            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                          >
                            {DOCUMENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {t(`resourcePerson.materials.documentType.${type}`)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="rp-attach">
                          <span className="rp-attach-or">{t('resourcePerson.materials.or')}</span>
                          <label className="call-field">
                            <span>{t('resourcePerson.materials.attachFile')}</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
                              onChange={(event) => attach(event.target.files?.[0])}
                            />
                          </label>
                          <p className="rp-attach-warning">{t('resourcePerson.materials.attachWarning')}</p>
                          {attached && (
                            <p className="rp-attach-file">
                              {attached.name} · {formatFileSize(attached.size)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <label className="call-field">
                        <span>
                          {kind === 'link'
                            ? t('resourcePerson.materials.materialUrl')
                            : t('resourcePerson.materials.materialText')}
                        </span>
                        {kind === 'link' ? (
                          <input type="url" value={body} onChange={(event) => setBody(event.target.value)} />
                        ) : (
                          <textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
                        )}
                      </label>
                    )}
                    {error && (
                      <p className="rp-error" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="rp-form-actions">
                      <button type="button" className="btn btn-primary btn-small" onClick={() => submit(batch.batchId)}>
                        {t('resourcePerson.materials.add')}
                      </button>
                      <button type="button" className="btn btn-outline btn-small" onClick={reset}>
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    onClick={() => {
                      setDraftFor(batch.batchId)
                      setTitle('')
                      setBody('')
                      setError(null)
                    }}
                  >
                    {t('resourcePerson.materials.addMaterial')}
                  </button>
                )}
              </section>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
