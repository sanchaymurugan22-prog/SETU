import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  loadTrainees,
  nextSessionAfter,
  openSessionAt,
  RESOURCE_PERSON,
  type Batch,
  type CourseMaterial,
  type FlagReason,
  type SessionSchedule,
  type Trainee,
} from '../../data/resourcePerson'
import {
  TrainerContext,
  type AttendanceMark,
  type StatusChange,
  type TraineeFlag,
} from './TrainerContext'

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function certificateFor(trainee: Trainee): string {
  return trainee.certificateId ?? `SETU-CERT-${trainee.beneficiaryId.slice(-4)}`
}

/**
 * One resource person's trainer state: trainees, the live schedule that decides when
 * attendance opens, materials and the flags raised to the Admin console.
 */
export function TrainerProvider({ children }: { children: ReactNode }) {
  const [trainees, setTrainees] = useState<Trainee[]>(loadTrainees)
  const [batches, setBatches] = useState<Batch[]>(() => RESOURCE_PERSON.batches.map((batch) => ({ ...batch })))
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({})
  const [flags, setFlags] = useState<TraineeFlag[]>([])
  const [nowMs, setNowMs] = useState(() => Date.now())

  // The schedule, not the trainer, decides when a sheet opens — so the clock has to run.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const now = useMemo(() => new Date(nowMs), [nowMs])
  const openSession = useMemo(() => openSessionAt(now, batches), [batches, now])
  const nextSession = useMemo(() => nextSessionAfter(now, batches), [batches, now])

  // One key per trainee per open session, so marks survive until the session ends.
  const keyFor = useCallback(
    (beneficiaryId: string) =>
      openSession
        ? `${openSession.batchId}|${now.toDateString()}|${openSession.startTime}|${beneficiaryId}`
        : null,
    [now, openSession],
  )

  const value = useMemo(
    () => ({
      trainees,
      batches,
      openSession,
      nextSession,
      now,
      markFor: (beneficiaryId: string) => {
        const key = keyFor(beneficiaryId)
        return key ? (marks[key] ?? null) : null
      },
      mark: (beneficiaryId: string, mark: AttendanceMark) => {
        const key = keyFor(beneficiaryId)
        if (!key) return
        setMarks((current) => ({ ...current, [key]: mark }))
      },
      attendanceOf: (trainee: Trainee) => {
        const base = trainee.attendance ?? { attended: 0, total: 0 }
        let attended = base.attended
        let total = base.total
        for (const [key, mark] of Object.entries(marks)) {
          if (!key.endsWith(`|${trainee.beneficiaryId}`)) continue
          total += 1
          if (mark === 'present') attended += 1
        }
        return { attended, total }
      },
      updateStatus: (beneficiaryId: string, change: StatusChange) =>
        setTrainees((current) =>
          current.map((trainee) => {
            if (trainee.beneficiaryId !== beneficiaryId) return trainee
            // Completion is what issues the certificate: no separate button to forget.
            const earnsCertificate = change.status === 'completed' || change.status === 'certified'
            return {
              ...trainee,
              status: change.status,
              nextCourse: change.nextCourse ?? trainee.nextCourse,
              jobRecommendation: change.jobRecommendation ?? trainee.jobRecommendation,
              certificateId: earnsCertificate ? certificateFor(trainee) : trainee.certificateId,
              statusHistory: [
                ...trainee.statusHistory,
                { status: change.status, description: change.description, whenLabel: today() },
              ],
            }
          }),
        ),
      flags,
      flagTrainee: (beneficiaryId: string, reason: FlagReason, note: string) => {
        const trainee = trainees.find((entry) => entry.beneficiaryId === beneficiaryId)
        if (!trainee) return
        setFlags((current) => [
          {
            flagId: `flag-${beneficiaryId}-${current.length + 1}`,
            beneficiaryId,
            name: trainee.name,
            reason,
            note,
            raisedAt: today(),
          },
          ...current,
        ])
      },
      updateSchedule: (batchId: string, patch: Partial<SessionSchedule>) =>
        setBatches((current) =>
          current.map((batch) =>
            batch.batchId === batchId ? { ...batch, schedule: { ...batch.schedule, ...patch } } : batch,
          ),
        ),
      addMaterial: (batchId: string, material: Omit<CourseMaterial, 'id'>) =>
        setBatches((current) =>
          current.map((batch) =>
            batch.batchId === batchId
              ? {
                  ...batch,
                  materials: [
                    ...batch.materials,
                    { ...material, id: `mat-${batchId}-${batch.materials.length + 1}-${Date.now()}` },
                  ],
                }
              : batch,
          ),
        ),
      removeMaterial: (batchId: string, materialId: string) =>
        setBatches((current) =>
          current.map((batch) =>
            batch.batchId === batchId
              ? { ...batch, materials: batch.materials.filter((item) => item.id !== materialId) }
              : batch,
          ),
        ),
    }),
    [batches, flags, keyFor, marks, nextSession, now, openSession, trainees],
  )

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>
}
