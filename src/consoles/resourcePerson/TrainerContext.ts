import { createContext, useContext } from 'react'
import type { EmploymentStatus, TrainingStatus } from '../../data/jharkhandBeneficiaries'
import type {
  Batch,
  CourseMaterial,
  FlagReason,
  SessionSchedule,
  SessionWindow,
  Trainee,
} from '../../data/resourcePerson'

export type AttendanceMark = 'present' | 'absent'

/** One session a trainer has taken, rebuilt from the attendance marks per trainee. */
export interface SessionRecord {
  sessionId: string
  batchId: string
  course: string
  /** 1-based position in that batch's run. */
  number: number
  dateIso: string
  startTime: string
  endTime: string
  present: number
  absent: number
  attendancePercent: number
  /** True for the session being marked right now. */
  live: boolean
  entries: { beneficiaryId: string; name: string; mark: AttendanceMark }[]
}

/** A trainee whose attendance has slipped below the watch level. */
export interface AttendanceConcern {
  trainee: Trainee
  attended: number
  total: number
  percent: number
}

/** A status change a trainer saved. The description is never optional. */
export interface StatusChange {
  status: TrainingStatus
  description: string
  /** Set when certifying: whether the trainee already has work. */
  employmentStatus?: EmploymentStatus
  nextCourse?: string
  jobRecommendation?: string
}

export interface TraineeFlag {
  flagId: string
  beneficiaryId: string
  name: string
  reason: FlagReason
  note: string
  raisedAt: string
}

/** Below this share of sessions attended, a trainee is called out on the summary. */
export const ATTENDANCE_WATCH_PERCENT = 75

export interface TrainerValue {
  trainees: Trainee[]
  batches: Batch[]
  /** Every session held, newest first. */
  sessions: SessionRecord[]
  /** Trainees whose attendance is falling, worst first. */
  concerns: AttendanceConcern[]
  /** The session whose attendance sheet is open now, or null outside scheduled hours. */
  openSession: SessionWindow | null
  nextSession: { window: SessionWindow; daysAhead: number } | null
  /** Ticking clock, so a sheet opens the moment the scheduled time arrives. */
  now: Date
  /** Present/absent for this trainee in the currently open session, if marked. */
  markFor: (beneficiaryId: string) => AttendanceMark | null
  mark: (beneficiaryId: string, value: AttendanceMark) => void
  /** Attendance including anything marked in this session. */
  attendanceOf: (trainee: Trainee) => { attended: number; total: number }
  updateStatus: (beneficiaryId: string, change: StatusChange) => void
  flags: TraineeFlag[]
  flagTrainee: (beneficiaryId: string, reason: FlagReason, note: string) => void
  updateSchedule: (batchId: string, patch: Partial<SessionSchedule>) => void
  addMaterial: (batchId: string, material: Omit<CourseMaterial, 'id'>) => void
  removeMaterial: (batchId: string, materialId: string) => void
  /** Issues the certificate for a trainee already certified. */
  issueCertificate: (beneficiaryId: string) => void

  /**
   * Whatever the last write said. Every action above is optimistic: the screen changes
   * first and this is set if Firestore then refused, by which point the change has been
   * rolled back — so a section showing these actions has to show this too.
   */
  writeError: string | null
  writePending: boolean
  clearWriteError: () => void
}

export const TrainerContext = createContext<TrainerValue | null>(null)

export function useTrainer(): TrainerValue {
  const value = useContext(TrainerContext)
  if (!value) throw new Error('useTrainer must be used inside <TrainerProvider>')
  return value
}
