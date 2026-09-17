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

export interface TrainerValue {
  trainees: Trainee[]
  batches: Batch[]
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
}

export const TrainerContext = createContext<TrainerValue | null>(null)

export function useTrainer(): TrainerValue {
  const value = useContext(TrainerContext)
  if (!value) throw new Error('useTrainer must be used inside <TrainerProvider>')
  return value
}
