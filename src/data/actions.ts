/**
 * Every action a console can take, as one function each.
 *
 * Each follows the shape `commit(apply, write)`: change the slot so the screen responds,
 * send the write, and on failure put the slot back and return the message. Nothing here
 * throws — callers are event handlers, and a rejected promise in one would leave the
 * optimistic change on screen with nothing said about it.
 *
 * The id of a new document is derived from its content rather than randomly generated,
 * so re-running an action is an overwrite rather than a duplicate — the same property
 * that makes the seeder safe to run twice.
 */

import { doc, increment, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  patchInSlot,
  readSlot,
  removeFromSlot,
  replaceSlot,
  upsertInSlot,
  type SlotName,
} from './source'
import { batched, clean, commit, setDocument, stamped, undoFor, updateDocument, type WriteResult } from './writes'
import type { Beneficiary, TrainingStatus, EmploymentStatus } from './jharkhandBeneficiaries'
import type { AdminFlagRecord, Centre, StaffRecord, SystemCall } from './adminConsole'
import type { CourseRecord } from './courseCatalogue'
import type { AttendanceRecord, Batch, CourseMaterial, SessionSchedule } from './resourcePerson'
import type { BlockGap } from './jharkhandGaps'
import type { CompletedCall, QueuedCall } from './jharkhandCalls'

const byStaff = (person: StaffRecord) => person.userId
const byBeneficiary = (person: Beneficiary) => person.beneficiaryId
const byCentre = (centre: Centre) => centre.centreId
const byCourse = (course: CourseRecord) => course.course
const byFlag = (flag: AdminFlagRecord) => flag.flagId
const byBatch = (batch: Batch) => batch.batchId
const byAttendance = (record: AttendanceRecord) => record.attendanceId
const byGap = (gap: BlockGap) => gap.gapId
const byQueued = (call: QueuedCall) => call.callId
const byCompleted = (call: CompletedCall) => call.callId
const bySystemCall = (call: SystemCall) => call.callId

/** A stable document id from free text — "Solar panel repair" → "solar-panel-repair". */
export function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/* ═══════════════════════ Admin console ═══════════════════════ */

/** Files the directory record. The sign-in account is issued separately — see `staff` in the rules. */
export async function addStaff(person: StaffRecord): Promise<WriteResult> {
  return commit(
    () => [undoFor('staff', upsertInSlot<StaffRecord>('staff', person, byStaff))],
    () => setDocument('staff', person.userId, person as unknown as Record<string, unknown>),
  )
}

/** Spec 6.2: deactivate rather than delete, so the history survives. */
export async function setStaffActive(userId: string, active: boolean): Promise<WriteResult> {
  return commit(
    () => [undoFor('staff', patchInSlot<StaffRecord>('staff', userId, byStaff, { active }))],
    () => updateDocument('staff', userId, { active }),
  )
}

/**
 * Posting a resource person: their centre and the courses they teach there.
 * The centre document records the assignment too, because that is what the attendance
 * rules read to decide whether this trainer may mark a sheet at that centre.
 */
export async function assignResourcePerson(
  userId: string,
  posting: { centre: string; centreId: string | null; district: string; block: string; courses: string[] },
  resourcePersonName: string,
): Promise<WriteResult> {
  const patch = {
    centre: posting.centre,
    district: posting.district,
    block: posting.block,
    courses: posting.courses,
  }
  return commit(
    () => {
      const undo = [undoFor('staff', patchInSlot<StaffRecord>('staff', userId, byStaff, patch))]
      if (posting.centreId) {
        undo.push(
          undoFor(
            'centres',
            patchInSlot<Centre>('centres', posting.centreId, byCentre, {
              resourcePersonId: userId,
              resourcePersonName,
            }),
          ),
        )
      }
      return undo
    },
    async () => {
      await batched((batch) => {
        batch.update(doc(db, 'staff', userId), stamped(patch))
        if (posting.centreId) {
          batch.update(
            doc(db, 'centres', posting.centreId),
            stamped({ resourcePersonId: userId, resourcePersonName, assignedResourcePerson: userId }),
          )
        }
      })
    },
  )
}

export async function addCourse(course: CourseRecord): Promise<WriteResult> {
  const id = slug(course.course)
  return commit(
    () => [undoFor('courses', upsertInSlot<CourseRecord>('courses', course, byCourse))],
    () => setDocument('courses', id, course as unknown as Record<string, unknown>),
  )
}

export async function addCentre(centre: Centre): Promise<WriteResult> {
  return commit(
    () => [undoFor('centres', upsertInSlot<Centre>('centres', centre, byCentre))],
    () => setDocument('centres', centre.centreId, centre as unknown as Record<string, unknown>),
  )
}

/**
 * Seats a batch of waiting beneficiaries at a centre.
 *
 * One Firestore batch, so the seat count and the people it counts move together: a
 * partial allotment would leave the centre claiming seats nobody holds.
 */
export async function allotToCentre(
  centre: Centre,
  beneficiaryIds: string[],
): Promise<WriteResult> {
  if (beneficiaryIds.length === 0) return { ok: true, error: null }
  const seats = { allotted: centre.allotted + beneficiaryIds.length, waiting: Math.max(0, centre.waiting - beneficiaryIds.length) }
  const patch = { centre: centre.name, trainingStatus: 'enrolled' as TrainingStatus }

  return commit(
    () => {
      const undo = [undoFor('centres', patchInSlot<Centre>('centres', centre.centreId, byCentre, seats))]
      let people = readSlot<Beneficiary>('beneficiaries')
      const before = people
      people = people.map((person) => (beneficiaryIds.includes(person.beneficiaryId) ? { ...person, ...patch } : person))
      replaceSlot('beneficiaries', people)
      undo.push(undoFor('beneficiaries', before))
      return undo
    },
    async () => {
      await batched((batch) => {
        batch.update(doc(db, 'centres', centre.centreId), stamped(seats))
        for (const id of beneficiaryIds) batch.update(doc(db, 'beneficiaries', id), stamped(patch))
      })
    },
  )
}

export async function assignFlagOfficer(
  flagId: string,
  officer: { userId: string; name: string },
): Promise<WriteResult> {
  const patch = { status: 'assigned' as const, assignedToId: officer.userId, assignedToName: officer.name }
  return commit(
    () => [undoFor('adminFlags', patchInSlot<AdminFlagRecord>('adminFlags', flagId, byFlag, patch))],
    () => updateDocument('adminFlags', flagId, patch),
  )
}

export async function resolveFlag(flagId: string, actionNote: string): Promise<WriteResult> {
  const patch = { status: 'resolved' as const }
  return commit(
    () => [undoFor('adminFlags', patchInSlot<AdminFlagRecord>('adminFlags', flagId, byFlag, patch))],
    () => updateDocument('adminFlags', flagId, { ...patch, actionNote }),
  )
}

/* ═══════════════════════ Resource person console ═══════════════════════ */

/**
 * One attendance document per trainee per session, which is what makes the Sessions
 * section and the Beneficiaries section agree: both read the same rows.
 *
 * The id is deterministic — batch, session number, person — so marking the same sheet
 * twice corrects the mark instead of filing a second one.
 */
export function attendanceIdFor(batchId: string, sessionNumber: number, beneficiaryId: string): string {
  return `${batchId}-s${sessionNumber}-${beneficiaryId}`
}

export async function markAttendance(
  entries: { beneficiaryId: string; mark: 'present' | 'absent' }[],
  session: { batchId: string; centreId: string; course: string; sessionNumber: number; sessionDate: string },
  markedBy: string,
): Promise<WriteResult> {
  if (entries.length === 0) return { ok: true, error: null }
  const records: AttendanceRecord[] = entries.map((entry) => ({
    attendanceId: attendanceIdFor(session.batchId, session.sessionNumber, entry.beneficiaryId),
    beneficiaryId: entry.beneficiaryId,
    centreId: session.centreId,
    batchId: session.batchId,
    course: session.course,
    sessionDate: session.sessionDate,
    sessionNumber: session.sessionNumber,
    mark: entry.mark,
    markedBy,
  }))

  return commit(
    () => {
      const before = readSlot<AttendanceRecord>('attendance')
      const ids = new Set(records.map(byAttendance))
      replaceSlot('attendance', [...records, ...before.filter((row) => !ids.has(byAttendance(row)))])
      return [undoFor('attendance', before)]
    },
    async () => {
      await batched((batch) => {
        for (const record of records) {
          batch.set(doc(db, 'attendance', record.attendanceId), stamped(record as unknown as Record<string, unknown>))
        }
      })
    },
  )
}

export interface TraineeStatusWrite {
  trainingStatus: TrainingStatus
  employmentStatus?: EmploymentStatus
  description: string
  nextCourse?: string | null
  jobRecommendation?: string | null
  /** Set when certifying; issuing the certificate is part of the same write. */
  certificateId?: string | null
}

/**
 * A status change, its description, and — when certifying — the recommendation and the
 * certificate, in one write. They are one act, so they must not be able to half-fail:
 * a certificate with no status behind it is worse than neither.
 */
export async function updateTraineeStatus(
  beneficiaryId: string,
  change: TraineeStatusWrite,
  existingHistory: { status: TrainingStatus; description: string; whenLabel: string }[],
): Promise<WriteResult> {
  const statusHistory = [
    ...existingHistory,
    { status: change.trainingStatus, description: change.description, whenLabel: todayLabel() },
  ]
  const patch: Partial<Beneficiary> = {
    trainingStatus: change.trainingStatus,
    statusHistory,
  }
  if (change.employmentStatus) patch.employmentStatus = change.employmentStatus
  if (change.nextCourse !== undefined || change.jobRecommendation !== undefined) {
    patch.completionRecommendation = {
      nextCourse: change.nextCourse ?? null,
      jobRecommendation: change.jobRecommendation ?? null,
    }
  }
  if (change.certificateId) {
    patch.certificateId = change.certificateId
    patch.certificateIssuedAt = isoToday()
  }

  return commit(
    () => [undoFor('beneficiaries', patchInSlot<Beneficiary>('beneficiaries', beneficiaryId, byBeneficiary, patch))],
    () => updateDocument('beneficiaries', beneficiaryId, clean(patch as Record<string, unknown>)),
  )
}

/** Issuing the certificate on its own, for a trainee already certified. */
export async function issueCertificate(beneficiaryId: string, certificateId: string): Promise<WriteResult> {
  const patch = { certificateId, certificateIssuedAt: isoToday() }
  return commit(
    () => [undoFor('beneficiaries', patchInSlot<Beneficiary>('beneficiaries', beneficiaryId, byBeneficiary, patch))],
    () => updateDocument('beneficiaries', beneficiaryId, patch),
  )
}

export async function flagTrainee(flag: AdminFlagRecord, raisedBy: string): Promise<WriteResult> {
  return commit(
    () => [undoFor('adminFlags', upsertInSlot<AdminFlagRecord>('adminFlags', flag, byFlag))],
    () =>
      setDocument('adminFlags', flag.flagId, {
        ...(flag as unknown as Record<string, unknown>),
        // raisedBy is the uid the rules check; the display name travels beside it.
        raisedBy,
        raisedByName: flag.raisedBy,
        status: 'open',
      }),
  )
}

export async function updateSchedule(batchId: string, schedule: SessionSchedule): Promise<WriteResult> {
  return commit(
    () => [undoFor('batches', patchInSlot<Batch>('batches', batchId, byBatch, { schedule }))],
    () => updateDocument('batches', batchId, { schedule: clean(schedule as unknown as Record<string, unknown>) }),
  )
}

/**
 * Materials are a field on the batch, not their own collection: the list is short, always
 * read with the batch, and replacing it whole keeps the order the trainer arranged.
 *
 * A demo-only attachment is never sent. The bytes live in browser memory because Storage
 * needs the Blaze plan, so writing the row would promise a file that is gone on reload.
 */
export async function saveMaterials(batchId: string, materials: CourseMaterial[]): Promise<WriteResult> {
  const persistable = materials.filter((material) => material.source !== 'demo-upload')
  return commit(
    () => [undoFor('batches', patchInSlot<Batch>('batches', batchId, byBatch, { materials }))],
    () =>
      updateDocument('batches', batchId, {
        materials: persistable.map((material) => clean(material as unknown as Record<string, unknown>)),
      }),
  )
}

/* ═══════════════════════ Call console ═══════════════════════ */

/**
 * Accepting a call claims it and takes the beneficiary privacy lock in the same batch —
 * which is exactly what the rules require: the lock is only grantable when the call
 * document in the same write says this official now handles it.
 */
export async function acceptCall(callId: string, beneficiaryId: string, uid: string): Promise<WriteResult> {
  return commit(
    () => [undoFor('queue', removeFromSlot<QueuedCall>('queue', callId, byQueued))],
    async () => {
      await batched((batch) => {
        batch.update(doc(db, 'calls', callId), stamped({ status: 'active', handledBy: uid, startedAt: isoToday() }))
        batch.update(doc(db, 'beneficiaries', beneficiaryId), { activeHandler: uid, activeCallId: callId })
      })
    },
  )
}

/**
 * Ending the call moves it to report review. The spec's lifecycle is
 * waiting → active → report-review → completed, and the rules enforce every step: a call
 * cannot go from active straight to completed, because the report review is mandatory and
 * skipping it in the data would make it optional in fact.
 */
export async function endCallForReview(callId: string): Promise<WriteResult> {
  return commit(
    () => [],
    () => updateDocument('calls', callId, { status: 'report-review' }),
  )
}

/** Spec 4.1 Stage 2: correcting what the AI captured, while the call is still active. */
export async function updateBeneficiaryDuringCall(
  beneficiaryId: string,
  patch: Partial<Beneficiary>,
): Promise<WriteResult> {
  return commit(
    () => [undoFor('beneficiaries', patchInSlot<Beneficiary>('beneficiaries', beneficiaryId, byBeneficiary, patch))],
    () => updateDocument('beneficiaries', beneficiaryId, clean(patch as Record<string, unknown>)),
  )
}

/** A callback case handed to a resource person. Spec 7.2: only ever out of an active call. */
export async function transferToResourcePerson(
  call: QueuedCall,
  target: { userId: string; name: string },
  transfer: { reason: string; subType: 'course-related' | 'common-related'; fromCallId: string },
): Promise<WriteResult> {
  const callId = `${transfer.fromCallId}-to-${target.userId}`
  const queued: QueuedCall = {
    ...call,
    callId,
    subType: transfer.subType,
    transferredFrom: transfer.reason,
    waitedSeconds: 0,
  }
  return commit(
    () => [undoFor('rpQueue', upsertInSlot<QueuedCall>('rpQueue', queued, byQueued))],
    () =>
      setDocument('calls', callId, {
        ...(queued as unknown as Record<string, unknown>),
        recordType: 'queued',
        callType: 'resourcePerson',
        status: 'waiting',
        handledBy: null,
        assignedTo: target.userId,
        transferredFromCallId: transfer.fromCallId,
        transferReason: transfer.reason,
      }),
  )
}

/**
 * Sending the report completes the call and releases the privacy lock in one batch —
 * the mirror of acceptCall. The completed record is a separate document because it is
 * what the Completed Calls list reads, and it carries no identity.
 */
export async function sendReport(
  report: CompletedCall,
  context: { sourceCallId: string; beneficiaryId: string | null; uid: string; callType: 'executive' | 'resourcePerson' },
): Promise<WriteResult> {
  const slot: SlotName = context.callType === 'executive' ? 'completed' : 'rpCompleted'
  return commit(
    () => [undoFor(slot, upsertInSlot<CompletedCall>(slot, report, byCompleted))],
    async () => {
      await batched((batch) => {
        batch.set(
          doc(db, 'calls', report.callId),
          stamped({
            ...(report as unknown as Record<string, unknown>),
            recordType: 'completed',
            callType: context.callType,
            status: 'completed',
            handledBy: context.uid,
            // The call this report is for. The rules read it to check the official
            // handled that call and that it reached report review.
            sourceCallId: context.sourceCallId,
            assignedTo: context.callType === 'resourcePerson' ? context.uid : null,
          }),
        )
        batch.update(doc(db, 'calls', context.sourceCallId), stamped({ status: 'completed' }))
        if (context.beneficiaryId) {
          batch.update(doc(db, 'beneficiaries', context.beneficiaryId), { activeHandler: null, activeCallId: null })
        }
      })
    },
  )
}

/* ═══════════════════════ AI demo call ═══════════════════════ */

/**
 * What the voice line produces: the person it met, and the call it had with them.
 *
 * One batch, because a call record pointing at a beneficiary who was never written is a
 * dangling reference an admin would find in the Beneficiaries section as a blank row.
 */
export async function recordAiCall(
  person: Beneficiary,
  call: SystemCall,
  completed: CompletedCall | null,
): Promise<WriteResult> {
  return commit(
    () => {
      const undo = [
        undoFor('beneficiaries', upsertInSlot<Beneficiary>('beneficiaries', person, byBeneficiary)),
        undoFor('calls', upsertInSlot<SystemCall>('calls', call, bySystemCall)),
      ]
      if (completed) undo.push(undoFor('completed', upsertInSlot<CompletedCall>('completed', completed, byCompleted)))
      return undo
    },
    async () => {
      await batched((batch) => {
        batch.set(
          doc(db, 'beneficiaries', person.beneficiaryId),
          stamped({
            ...(person as unknown as Record<string, unknown>),
            // What the rules check before letting a staff session create this at all.
            createdBy: 'ai-call',
            activeHandler: null,
            activeCallId: null,
          }),
        )
        batch.set(
          doc(db, 'calls', call.callId),
          stamped({
            ...(call as unknown as Record<string, unknown>),
            recordType: 'system',
            callType: 'ai',
            status: 'completed',
            handledBy: null,
            assignedTo: null,
          }),
        )
      })
    },
  )
}

/** A call the AI could not place — it joins the executive queue. Spec Case F. */
export async function queueEscalatedCall(call: QueuedCall, beneficiaryId: string): Promise<WriteResult> {
  return commit(
    () => [undoFor('queue', upsertInSlot<QueuedCall>('queue', call, byQueued))],
    () =>
      setDocument('calls', call.callId, {
        ...(call as unknown as Record<string, unknown>),
        recordType: 'queued',
        callType: 'executive',
        status: 'waiting',
        handledBy: null,
        assignedTo: null,
        beneficiaryId,
      }),
  )
}

/**
 * The two models disagreed about this caller, so the block has a language SETU cannot
 * serve. `increment` rather than a read-then-write: two contested calls in the same
 * minute must both be counted, and the rules permit exactly a step of one.
 */
export async function recordContestedDetection(gapId: string): Promise<WriteResult> {
  const current = readSlot<BlockGap>('gaps').find((gap) => gap.gapId === gapId)
  const next = (current?.contestedDetections ?? 0) + 1
  return commit(
    () => [undoFor('gaps', patchInSlot<BlockGap>('gaps', gapId, byGap, { contestedDetections: next }))],
    async () => {
      await updateDoc(doc(db, 'gapData', gapId), { contestedDetections: increment(1) })
    },
  )
}
