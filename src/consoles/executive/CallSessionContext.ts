import { createContext, useContext } from 'react'
import type { CompletedCall, OutcomeKey, QueuedCall, TransferReason } from '../../data/jharkhandCalls'
import type { Beneficiary } from '../../data/jharkhandBeneficiaries'

/** The beneficiary fields an executive may correct while the call is live. */
export interface EditableRecord {
  name: string
  age: number
  gender: string
  district: string
  block: string
  village: string
  educationLevel: string
  currentWork: string
  interests: string[]
  constraints: string[]
  primaryNumber: string
  secondaryNumber: string
  consentGiven: boolean
}

export interface ReportDraft {
  discussion: string
  course: string
  outcome: OutcomeKey
  actions: string[]
}

export interface ActiveCall {
  call: QueuedCall
  beneficiary: Beneficiary
  record: EditableRecord
  notes: string
  /** Seconds on the call, derived from the ticking clock rather than stored. */
  elapsedSeconds: number
  onHold: boolean
  transfer: { reason: TransferReason; resourcePersonId: string; resourcePersonName: string } | null
}

export interface CallSessionValue {
  queue: QueuedCall[]
  completed: CompletedCall[]
  active: ActiveCall | null
  /** Set once the call ends: the report modal is open and cannot be dismissed. */
  reportFor: ActiveCall | null
  draft: ReportDraft | null
  available: boolean
  setAvailable: (value: boolean) => void
  /** False in the Resource Person console: a case transferred here is not passed on again. */
  allowTransfer: boolean
  /** Seconds each queued call has waited, ticking up live. */
  waitedSeconds: (call: QueuedCall) => number
  accept: (callId: string) => void
  editRecord: (patch: Partial<EditableRecord>) => void
  setNotes: (notes: string) => void
  toggleHold: () => void
  transfer: (reason: TransferReason, resourcePersonId: string, resourcePersonName: string) => void
  endCall: () => void
  editDraft: (patch: Partial<ReportDraft>) => void
  sendReport: () => void
}

export const CallSessionContext = createContext<CallSessionValue | null>(null)

export function useCallSession(): CallSessionValue {
  const value = useContext(CallSessionContext)
  if (!value) throw new Error('useCallSession must be used inside <CallSessionProvider>')
  return value
}
