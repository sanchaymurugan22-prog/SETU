import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  loadTrainees,
  nextSessionAfter,
  openSessionAt,
  RESOURCE_PERSON,
  sessionDates,
  type Batch,
  type CourseMaterial,
  type FlagReason,
  type SessionSchedule,
  type Trainee,
} from '../../data/resourcePerson'
import {
  ATTENDANCE_WATCH_PERCENT,
  TrainerContext,
  type AttendanceConcern,
  type AttendanceMark,
  type SessionRecord,
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

  /**
   * Sessions are derived, never stored: each trainee's attendance array is one mark per
   * session held, so reading down the same index across a batch reconstructs that
   * session's register. Anything marked in the open session today is folded in as a live
   * session, which is why this and the Beneficiaries list can never drift apart.
   */
  const sessions = useMemo(() => {
    const records: SessionRecord[] = []

    for (const batch of batches) {
      const members = trainees.filter((trainee) => trainee.batchId === batch.batchId)
      const held = members.reduce((most, trainee) => Math.max(most, trainee.attendance?.sessions.length ?? 0), 0)
      const dates = sessionDates(batch, held)

      for (let index = 0; index < held; index += 1) {
        const entries = members
          .filter((trainee) => (trainee.attendance?.sessions.length ?? 0) > index)
          .map((trainee) => ({
            beneficiaryId: trainee.beneficiaryId,
            name: trainee.name,
            mark: trainee.attendance!.sessions[index]! as AttendanceMark,
          }))
        if (entries.length === 0) continue
        const present = entries.filter((entry) => entry.mark === 'present').length
        records.push({
          sessionId: `${batch.batchId}-${index + 1}`,
          batchId: batch.batchId,
          course: batch.course,
          number: index + 1,
          dateIso: dates[index] ?? batch.startDate,
          startTime: batch.schedule.startTime,
          endTime: batch.schedule.endTime,
          present,
          absent: entries.length - present,
          attendancePercent: Math.round((present / entries.length) * 100),
          live: false,
          entries,
        })
      }
    }

    // The session being marked right now, if anything has been marked in it.
    if (openSession) {
      const marked = Object.entries(marks).filter(([key]) => key.startsWith(`${openSession.batchId}|`))
      if (marked.length > 0) {
        const entries = marked.map(([key, mark]) => {
          const beneficiaryId = key.split('|').pop()!
          return {
            beneficiaryId,
            name: trainees.find((trainee) => trainee.beneficiaryId === beneficiaryId)?.name ?? beneficiaryId,
            mark,
          }
        })
        const present = entries.filter((entry) => entry.mark === 'present').length
        const batchSessions = records.filter((record) => record.batchId === openSession.batchId).length
        records.push({
          sessionId: `${openSession.batchId}-live`,
          batchId: openSession.batchId,
          course: openSession.course,
          number: batchSessions + 1,
          dateIso: now.toISOString().slice(0, 10),
          startTime: openSession.startTime,
          endTime: openSession.endTime,
          present,
          absent: entries.length - present,
          attendancePercent: Math.round((present / entries.length) * 100),
          live: true,
          entries,
        })
      }
    }

    return records.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.number - a.number)
  }, [batches, marks, now, openSession, trainees])

  const concerns = useMemo(() => {
    const list: AttendanceConcern[] = []
    for (const trainee of trainees) {
      const base = trainee.attendance
      if (!base || base.sessions.length === 0) continue
      let attended = base.attended
      // Against the sessions actually held, not the course length: missing sessions that
      // have not happened yet is not falling behind.
      let total = base.sessions.length
      for (const [key, mark] of Object.entries(marks)) {
        if (!key.endsWith(`|${trainee.beneficiaryId}`)) continue
        total += 1
        if (mark === 'present') attended += 1
      }
      const percent = Math.round((attended / total) * 100)
      // Someone who has finished or left is not "falling behind" — only those still coming.
      const stillTraining = trainee.trainingStatus === 'attending' || trainee.trainingStatus === 'irregular'
      if (percent < ATTENDANCE_WATCH_PERCENT && stillTraining) list.push({ trainee, attended, total, percent })
    }
    return list.sort((a, b) => a.percent - b.percent)
  }, [marks, trainees])

  const value = useMemo(
    () => ({
      trainees,
      batches,
      sessions,
      concerns,
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
            // Certifying is what issues the certificate: no separate button to forget.
            const earnsCertificate = change.status === 'certified'
            return {
              ...trainee,
              trainingStatus: change.status,
              employmentStatus: change.employmentStatus ?? trainee.employmentStatus,
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
    [batches, concerns, flags, keyFor, marks, nextSession, now, openSession, sessions, trainees],
  )

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>
}
