import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { loadCentres } from '../../data/adminConsole'
import {
  certificateIdFor,
  loadAttendance,
  loadBatches,
  loadTrainees,
  nextSessionAfter,
  openSessionAt,
  RESOURCE_PERSON,
  sessionDates,
  type CourseMaterial,
  type FlagReason,
  type SessionSchedule,
  type Trainee,
} from '../../data/resourcePerson'
import {
  flagTrainee as writeFlag,
  issueCertificate as writeCertificate,
  markAttendance,
  saveMaterials,
  updateSchedule as writeSchedule,
  updateTraineeStatus,
} from '../../data/actions'
import { useAction } from '../../data/useAction'
import { useDataSource } from '../../data/useDataSource'
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
  const { state } = useAuth()
  const uid = state.status === 'ready' ? state.staff.userId : ''
  const action = useAction()
  // Three slots feed this console; naming them keeps the derived memos honest about
  // when they have to run again.
  const traineeSource = useDataSource('beneficiaries')
  const attendanceSource = useDataSource('attendance')
  const batchSource = useDataSource('batches')

  const trainees = loadTrainees()
  const batches = loadBatches()
  const attendance = loadAttendance()
  const [flags, setFlags] = useState<TraineeFlag[]>([])
  const [nowMs, setNowMs] = useState(() => Date.now())

  // The schedule, not the trainer, decides when a sheet opens — so the clock has to run.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  /**
   * The attendance rules check that this trainer runs the centre the sheet belongs to, so
   * the row has to carry the centre's id and not its name.
   */
  const centreIdFor = useCallback(
    (centreName: string) =>
      loadCentres().find((centre) => centre.name === centreName)?.centreId ?? centreName,
    [],
  )

  const now = useMemo(() => new Date(nowMs), [nowMs])
  const openSession = useMemo(() => openSessionAt(now, batches), [batches, now])
  const nextSession = useMemo(() => nextSessionAfter(now, batches), [batches, now])

  /** Sessions already on each trainee's record, per batch — what the next one numbers from. */
  const heldByBatch = useMemo(() => {
    const held: Record<string, number> = {}
    for (const batch of batches) {
      held[batch.batchId] = trainees
        .filter((trainee) => trainee.batchId === batch.batchId)
        .reduce((most, trainee) => Math.max(most, trainee.attendance?.sessions.length ?? 0), 0)
    }
    return held
    // trainees and batches both come from module-level slots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, trainees, traineeSource.loadedAt, traineeSource.items])

  const openSessionNumber = openSession ? (heldByBatch[openSession.batchId] ?? 0) + 1 : null

  /**
   * What has been marked in the session open right now, read back out of the attendance
   * rows rather than kept in a separate map. That is the whole point: the sheet, the
   * Sessions register and the trainee's own attendance figure are three views of one set
   * of documents, so they cannot drift — and a mark survives a reload because it was a
   * document before it was a tick on the screen.
   */
  const marks = useMemo(() => {
    const map: Record<string, AttendanceMark> = {}
    if (!openSession || openSessionNumber === null) return map
    for (const row of attendance) {
      if (row.batchId === openSession.batchId && row.sessionNumber === openSessionNumber) {
        map[row.beneficiaryId] = row.mark
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance, openSession, openSessionNumber, attendanceSource.loadedAt, attendanceSource.items])

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
      const marked = Object.entries(marks)
      if (marked.length > 0) {
        const entries = marked.map(([beneficiaryId, mark]) => ({
          beneficiaryId,
          name: trainees.find((trainee) => trainee.beneficiaryId === beneficiaryId)?.name ?? beneficiaryId,
          mark,
        }))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, marks, now, openSession, trainees, traineeSource.loadedAt, batchSource.loadedAt])

  const concerns = useMemo(() => {
    const list: AttendanceConcern[] = []
    for (const trainee of trainees) {
      const base = trainee.attendance
      if (!base || base.sessions.length === 0) continue
      let attended = base.attended
      // Against the sessions actually held, not the course length: missing sessions that
      // have not happened yet is not falling behind.
      let total = base.sessions.length
      const live = marks[trainee.beneficiaryId]
      if (live) {
        total += 1
        if (live === 'present') attended += 1
      }
      const percent = Math.round((attended / total) * 100)
      // Someone who has finished or left is not "falling behind" — only those still coming.
      const stillTraining = trainee.trainingStatus === 'attending' || trainee.trainingStatus === 'irregular'
      if (percent < ATTENDANCE_WATCH_PERCENT && stillTraining) list.push({ trainee, attended, total, percent })
    }
    return list.sort((a, b) => a.percent - b.percent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, trainees, traineeSource.loadedAt])

  const value = useMemo(
    () => ({
      trainees,
      batches,
      sessions,
      concerns,
      openSession,
      nextSession,
      now,
      markFor: (beneficiaryId: string) => marks[beneficiaryId] ?? null,

      /**
       * One tick is one attendance document, written as it is made rather than collected
       * and saved at the end. A trainer marking a register gets interrupted; a sheet that
       * only saves on a button nobody pressed is a session that never happened.
       */
      mark: (beneficiaryId: string, mark: AttendanceMark) => {
        if (!openSession || openSessionNumber === null) return
        const batch = batches.find((entry) => entry.batchId === openSession.batchId)
        if (!batch) return
        void action.run(() =>
          markAttendance(
            [{ beneficiaryId, mark }],
            {
              batchId: openSession.batchId,
              centreId: centreIdFor(batch.centre),
              course: batch.course,
              sessionNumber: openSessionNumber,
              sessionDate: now.toISOString().slice(0, 10),
            },
            uid,
          ),
        )
      },

      attendanceOf: (trainee: Trainee) => {
        const base = trainee.attendance ?? { attended: 0, total: 0 }
        const live = marks[trainee.beneficiaryId]
        if (!live) return { attended: base.attended, total: base.total }
        return { attended: base.attended + (live === 'present' ? 1 : 0), total: base.total + 1 }
      },

      /**
       * Status, its description, the recommendation and — when certifying — the
       * certificate, in one write. Certifying is what issues the certificate, so there is
       * no second button to forget.
       */
      updateStatus: (beneficiaryId: string, change: StatusChange) => {
        const trainee = trainees.find((entry) => entry.beneficiaryId === beneficiaryId)
        if (!trainee) return
        void action.run(() =>
          updateTraineeStatus(
            beneficiaryId,
            {
              trainingStatus: change.status,
              employmentStatus: change.employmentStatus,
              description: change.description,
              nextCourse: change.nextCourse ?? trainee.nextCourse,
              jobRecommendation: change.jobRecommendation ?? trainee.jobRecommendation,
              certificateId: change.status === 'certified' ? certificateFor(trainee) : undefined,
            },
            trainee.statusHistory,
          ),
        )
      },

      issueCertificate: (beneficiaryId: string) => {
        void action.run(() => writeCertificate(beneficiaryId, certificateIdFor(beneficiaryId)))
      },

      flags,
      flagTrainee: (beneficiaryId: string, reason: FlagReason, note: string) => {
        const trainee = trainees.find((entry) => entry.beneficiaryId === beneficiaryId)
        if (!trainee) return
        const record = {
          flagId: `flag-${beneficiaryId}-${Date.now()}`,
          beneficiaryId,
          name: trainee.name,
          district: trainee.district,
          block: trainee.block,
          course: trainee.course,
          reason,
          note,
          raisedBy: RESOURCE_PERSON.name,
          raisedLabel: today(),
          raisedDaysAgo: 0,
          status: 'open' as const,
          assignedToId: null,
          assignedToName: null,
        }
        void action.run(async () => {
          const result = await writeFlag(record, uid)
          if (result.ok) {
            // The trainer's own list of what they have raised, for the confirmation.
            setFlags((current) => [
              { flagId: record.flagId, beneficiaryId, name: trainee.name, reason, note, raisedAt: today() },
              ...current,
            ])
          }
          return result
        })
      },

      updateSchedule: (batchId: string, patch: Partial<SessionSchedule>) => {
        const batch = batches.find((entry) => entry.batchId === batchId)
        if (!batch) return
        void action.run(() => writeSchedule(batchId, { ...batch.schedule, ...patch }))
      },

      addMaterial: (batchId: string, material: Omit<CourseMaterial, 'id'>) => {
        const batch = batches.find((entry) => entry.batchId === batchId)
        if (!batch) return
        const added = { ...material, id: `mat-${batchId}-${Date.now()}` }
        void action.run(() => saveMaterials(batchId, [...batch.materials, added]))
      },

      removeMaterial: (batchId: string, materialId: string) => {
        const batch = batches.find((entry) => entry.batchId === batchId)
        if (!batch) return
        void action.run(() =>
          saveMaterials(batchId, batch.materials.filter((item) => item.id !== materialId)),
        )
      },

      writeError: action.error,
      writePending: action.pending,
      clearWriteError: action.clear,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, batches, centreIdFor, concerns, flags, marks, nextSession, now, openSession, openSessionNumber, sessions, trainees, uid],
  )

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>
}
