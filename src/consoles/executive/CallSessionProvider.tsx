import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  beneficiaryForCall,
  loadCompleted,
  loadQueue,
  type CompletedCall,
  type QueuedCall,
  type TransferReason,
} from '../../data/jharkhandCalls'
import type { Beneficiary } from '../../data/jharkhandBeneficiaries'
import { useAuth } from '../../auth/AuthContext'
import {
  acceptCall,
  endCallForReview,
  sendReport as writeReport,
  transferToResourcePerson,
  updateBeneficiaryDuringCall,
} from '../../data/actions'
import { useAction } from '../../data/useAction'
import { liveVersion, subscribeLiveCalls } from '../../data/liveCalls'
import { sourceVersion, subscribeSource } from '../../data/source'
import { bhashiniConfigFromEnv } from '../../lib/env'
import { createCallDetector } from '../../lib/languageDetection'
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
  // Accepted calls leave the queue and sent reports join the completed list, but both
  // lists themselves are derived rather than snapshotted — see the memos below.
  const { state: auth } = useAuth()
  const uid = auth.status === 'ready' ? auth.staff.userId : ''
  const role = auth.status === 'ready' ? auth.staff.role : 'executive'
  const action = useAction()
  const [accepted, setAccepted] = useState<string[]>([])
  const [sentReports, setSentReports] = useState<CompletedCall[]>([])
  const [state, setState] = useState<CallState | null>(null)
  const [report, setReport] = useState<{ state: CallState; elapsedSeconds: number } | null>(null)
  const [draft, setDraft] = useState<ReportDraft | null>(null)
  const [available, setAvailable] = useState(true)
  const [openedAt] = useState(() => Date.now())
  // Live two-model detection when credentials and call audio are both present; the seeded
  // record otherwise. Built once, so the same detector serves every call in the session.
  const [detector] = useState(() =>
    createCallDetector(
      (callId) => queueSource().find((call) => call.callId === callId)?.detection,
      bhashiniConfigFromEnv(),
    ),
  )
  const [now, setNow] = useState(() => Date.now())
  const sentCount = useRef(0)
  // The write handlers below run from event callbacks and need the call as it is now,
  // not as it was when this render's closure was built.
  const stateRef = useRef<CallState | null>(null)
  stateRef.current = state

  /**
   * Two things move under this provider while it is mounted: a call placed in the AI Demo
   * Call section joins the live store, and the Firestore slot replaces the sample once the
   * query answers. Subscribing to both and deriving the lists — rather than snapshotting
   * them at mount — is what makes the demo work in either order, and what stops the queue
   * showing sample rows beside live ones after the slot fills.
   */
  const live = useSyncExternalStore(subscribeLiveCalls, liveVersion, liveVersion)
  const version = useSyncExternalStore(subscribeSource, sourceVersion, sourceVersion)

  const queue = useMemo(
    () => queueSource().filter((call) => !accepted.includes(call.callId)),
    // queueSource reads the module-level slot, which the linter cannot see changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queueSource, accepted, live, version],
  )
  const completed = useMemo(
    () => [...sentReports, ...completedSource()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedSource, sentReports, live, version],
  )

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
        setAccepted((ids) => [...ids, callId])
        /**
         * Claiming the call and taking the beneficiary privacy lock is one write, which
         * is what the rules require: the lock is only grantable when the call document in
         * the same batch says this official now handles it.
         */
        void action.run(() => acceptCall(callId, call.beneficiaryId, uid))

        // The caller has already answered the bilingual greeting by the time an executive
        // picks up, so detection runs on accept. With telephony wired in, sample.audio is
        // that first utterance; until then the detector returns the seeded record.
        void detector
          .detect({ callId, audio: call.audioSample })
          .then((detection) =>
            setState((current) =>
              current && current.call.callId === callId
                ? { ...current, call: { ...current.call, detection } }
                : current,
            ),
          )
          .catch(() => undefined)

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
      /**
       * Spec 4.1 Stage 2. Typing is local; the write goes out when the field is left, so
       * a correction is one document write rather than one per keystroke. `commitRecord`
       * below is what the panel calls on blur.
       */
      editRecord: (patch: Partial<EditableRecord>) =>
        setState((current) => (current ? { ...current, record: { ...current.record, ...patch } } : current)),
      commitRecord: () => {
        const current = stateRef.current
        if (!current) return
        void action.run(() =>
          updateBeneficiaryDuringCall(current.call.beneficiaryId, {
            name: current.record.name,
            age: current.record.age,
            gender: current.record.gender === 'M' ? 'M' : 'F',
            primaryNumber: current.record.primaryNumber,
            secondaryNumber: current.record.secondaryNumber || null,
            district: current.record.district,
            block: current.record.block,
            village: current.record.village,
            educationLevel: current.record.educationLevel,
            currentWork: current.record.currentWork,
            interests: current.record.interests,
          }),
        )
      },
      setNotes: (notes: string) => setState((current) => (current ? { ...current, notes } : current)),
      toggleHold: () =>
        setState((current) => {
          if (!current) return current
          if (current.onHold) return { ...current, onHold: false, startedAt: Date.now() - current.heldElapsed * 1000 }
          return { ...current, onHold: true, heldElapsed: Math.floor((Date.now() - current.startedAt) / 1000) }
        }),
      transfer: (reason: TransferReason, resourcePersonId: string, resourcePersonName: string) => {
        setState((current) =>
          current ? { ...current, transfer: { reason, resourcePersonId, resourcePersonName } } : current,
        )
        const current = stateRef.current
        if (!current) return
        void action.run(() =>
          transferToResourcePerson(
            current.call,
            { userId: resourcePersonId, name: resourcePersonName },
            {
              reason,
              // Spec 7.2: a case reaching a resource person is one or the other. A course
              // question is about the course; the other two reasons are about the person.
              subType: reason === 'course-question' ? 'course-related' : 'common-related',
              fromCallId: current.call.callId,
            },
          ),
        )
      },
      endCall: () => {
        if (!state) return
        const elapsedSeconds = elapsedOf(state)
        // The mandatory report review is a real state the call passes through, not just a
        // modal: the rules refuse active → completed, so it has to be recorded.
        void action.run(() => endCallForReview(state.call.callId))
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
        setSentReports((entries) => [sent, ...entries])
        setReport(null)
        setDraft(null)
        // Completing the call releases the privacy lock in the same batch — the mirror of
        // accepting it. Identity goes back to being invisible the moment the report is
        // filed, which is the rule the whole lock exists to enforce.
        void action.run(() =>
          writeReport(sent, {
            sourceCallId: report.state.call.callId,
            beneficiaryId: report.state.call.beneficiaryId,
            uid,
            callType: role === 'resourcePerson' ? 'resourcePerson' : 'executive',
          }),
        )
      },
      writeError: action.error,
      writePending: action.pending,
      clearWriteError: action.clear,
    }),
    [
      allowTransfer,
      available,
      completed,
      detector,
      draft,
      elapsedOf,
      queue,
      refPrefix,
      report,
      role,
      state,
      toActive,
      uid,
      waitedSeconds,
      action,
    ],
  )

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>
}
