import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  beneficiaryForCall,
  loadCompleted,
  loadQueue,
  type CompletedCall,
  type QueuedCall,
  type TransferReason,
} from '../../data/jharkhandCalls'
import type { Beneficiary } from '../../data/jharkhandBeneficiaries'
import {
  CallSessionContext,
  type ActiveCall,
  type EditableRecord,
  type ReportDraft,
} from './CallSessionContext'

/** Everything about a live call except the elapsed time, which is derived from the clock. */
interface CallState {
  call: QueuedCall
  beneficiary: Beneficiary
  record: EditableRecord
  notes: string
  /** When the timer started; moved forward when a hold is released. */
  startedAt: number
  onHold: boolean
  /** Seconds counted when the hold began. */
  heldElapsed: number
  transfer: { reason: TransferReason; resourcePersonId: string; resourcePersonName: string } | null
}

function recordFrom(beneficiary: Beneficiary): EditableRecord {
  return {
    name: beneficiary.name,
    age: beneficiary.age,
    gender: beneficiary.gender,
    district: beneficiary.district,
    block: beneficiary.block,
    village: beneficiary.village,
    educationLevel: beneficiary.educationLevel,
    currentWork: beneficiary.currentWork,
    interests: [...beneficiary.interests],
    constraints: [...beneficiary.aiFlags],
    primaryNumber: beneficiary.primaryNumber,
    secondaryNumber: beneficiary.secondaryNumber ?? '',
    consentGiven: true,
  }
}

export interface CallSessionProviderProps {
  children: ReactNode
  /** Which queue this console works from. Defaults to the Call Console's own. */
  queueSource?: () => QueuedCall[]
  completedSource?: () => CompletedCall[]
  /** Prefix for the reference number printed on a sent report. */
  refPrefix?: string
  /** The Resource Person console ends cases rather than transferring them on. */
  allowTransfer?: boolean
}

/**
 * Holds one official's call session. Mounted around a whole call console so the
 * mandatory report modal survives moving between Waiting Calls and Completed Calls.
 * The Resource Person console mounts the same provider with its own two loaders.
 */
export function CallSessionProvider({
  children,
  queueSource = loadQueue,
  completedSource = loadCompleted,
  refPrefix = 'CR',
  allowTransfer = true,
}: CallSessionProviderProps) {
  const [queue, setQueue] = useState<QueuedCall[]>(queueSource)
  const [completed, setCompleted] = useState<CompletedCall[]>(completedSource)
  const [state, setState] = useState<CallState | null>(null)
  const [report, setReport] = useState<{ state: CallState; elapsedSeconds: number } | null>(null)
  const [draft, setDraft] = useState<ReportDraft | null>(null)
  const [available, setAvailable] = useState(true)
  const [openedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const sentCount = useRef(0)

  // One clock drives both the queue wait times and the call timer.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const elapsedOf = useCallback(
    (call: CallState) => (call.onHold ? call.heldElapsed : Math.floor((now - call.startedAt) / 1000)),
    [now],
  )

  const waitedSeconds = useCallback(
    (call: QueuedCall) => call.waitedSeconds + Math.floor((now - openedAt) / 1000),
    [now, openedAt],
  )

  const toActive = useCallback(
    (call: CallState): ActiveCall => ({
      call: call.call,
      beneficiary: call.beneficiary,
      record: call.record,
      notes: call.notes,
      elapsedSeconds: elapsedOf(call),
      onHold: call.onHold,
      transfer: call.transfer,
    }),
    [elapsedOf],
  )

  const value = useMemo(
    () => ({
      queue,
      completed,
      active: state ? toActive(state) : null,
      reportFor: report ? { ...toActive(report.state), elapsedSeconds: report.elapsedSeconds } : null,
      draft,
      available,
      setAvailable,
      allowTransfer,
      waitedSeconds,
      accept: (callId: string) => {
        if (state || report) return
        const call = queue.find((entry) => entry.callId === callId)
        if (!call) return
        const beneficiary = beneficiaryForCall(call.beneficiaryId)
        setQueue((entries) => entries.filter((entry) => entry.callId !== callId))
        setState({
          call,
          beneficiary,
          record: recordFrom(beneficiary),
          notes: '',
          startedAt: Date.now(),
          onHold: false,
          heldElapsed: 0,
          transfer: null,
        })
      },
      editRecord: (patch: Partial<EditableRecord>) =>
        setState((current) => (current ? { ...current, record: { ...current.record, ...patch } } : current)),
      setNotes: (notes: string) => setState((current) => (current ? { ...current, notes } : current)),
      toggleHold: () =>
        setState((current) => {
          if (!current) return current
          if (current.onHold) return { ...current, onHold: false, startedAt: Date.now() - current.heldElapsed * 1000 }
          return { ...current, onHold: true, heldElapsed: Math.floor((Date.now() - current.startedAt) / 1000) }
        }),
      transfer: (reason: TransferReason, resourcePersonId: string, resourcePersonName: string) =>
        setState((current) =>
          current ? { ...current, transfer: { reason, resourcePersonId, resourcePersonName } } : current,
        ),
      endCall: () => {
        if (!state) return
        const elapsedSeconds = elapsedOf(state)
        setReport({ state, elapsedSeconds })
        setDraft({
          discussion: state.call.draftDiscussion,
          course: state.call.draftCourse,
          outcome: state.transfer ? 'transferred-resource-person' : state.call.draftOutcome,
          actions: state.transfer
            ? [...state.call.draftActions, `Callback case sent to ${state.transfer.resourcePersonName}`]
            : [...state.call.draftActions],
        })
        setState(null)
      },
      editDraft: (patch: Partial<ReportDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current)),
      sendReport: () => {
        if (!report || !draft) return
        sentCount.current += 1
        const sent: CompletedCall = {
          callId: `${report.state.call.callId}-sent-${sentCount.current}`,
          ref: `${refPrefix}-79${String(10 + sentCount.current).padStart(2, '0')}`,
          subType: report.state.call.subType,
          // The detected language travels with the report; it was never a choice to make.
          detection: report.state.call.detection,
          whenLabel: `${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          daysAgo: 0,
          durationSeconds: report.elapsedSeconds,
          discussion: draft.discussion,
          course: draft.course,
          actions: draft.actions,
          outcome: draft.outcome,
        }
        // Identity is not carried into the completed list: report content only.
        setCompleted((entries) => [sent, ...entries])
        setReport(null)
        setDraft(null)
      },
    }),
    [allowTransfer, available, completed, draft, elapsedOf, queue, refPrefix, report, state, toActive, waitedSeconds],
  )

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>
}
