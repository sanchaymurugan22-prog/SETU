/**
 * Reading the admin's data from Firestore.
 *
 * Both collections are mapped defensively: a document missing a field falls back to a
 * sane value rather than rendering NaN across the map. If a query fails — offline,
 * rules, a cold project — the slot keeps the seeded sample and the UI says so, because
 * an empty map in front of a room is worse than an honest "sample data" badge.
 */

import { collection, getDocs, limit, query, where, type QueryConstraint } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { BlockGap } from './jharkhandGaps'
import type { Beneficiary, EmploymentStatus, TrainingStatus } from './jharkhandBeneficiaries'
import type { AdminFlagRecord, Centre, FollowUpRecord, SystemCall } from './adminConsole'
import type { CompletedCall, OutcomeKey, QueuedCall, ReasonTag } from './jharkhandCalls'
import type { CourseRecord } from './courseCatalogue'
import type { AttendanceRecord } from './resourcePerson'
import { fillFromFirestore, markFailed, markLoading, type SlotName } from './source'

/**
 * Per-collection read caps. The free tier allows 50,000 reads a day, and a console that
 * fetched whole collections on every page load would burn through that in a morning —
 * so each query is bounded at roughly what one screen can use, and sorting happens in
 * the browser rather than through an indexed orderBy.
 */
const LIMITS: Record<SlotName, number> = {
  gaps: 100,
  beneficiaries: 200,
  calls: 300,
  followUps: 300,
  courses: 50,
  centres: 100,
  attendance: 500,
  adminFlags: 100,
  queue: 60,
  completed: 60,
  rpQueue: 60,
  rpCompleted: 60,
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function count(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function toGap(id: string, data: Record<string, unknown>): BlockGap {
  return {
    gapId: text(data.gapId, id),
    block: text(data.block),
    district: text(data.district),
    latitude: count(data.latitude),
    longitude: count(data.longitude),
    course: text(data.course),
    gapType: data.gapType === 'no-local-jobs' ? 'no-local-jobs' : 'no-centre',
    peopleAffected: count(data.peopleAffected),
    demandCount: count(data.demandCount),
    centreCapacity: count(data.centreCapacity),
    trainedCount: count(data.trainedCount),
    placedCount: count(data.placedCount),
    unplacedCount: count(data.unplacedCount),
    nearestCentreKm: typeof data.nearestCentreKm === 'number' ? data.nearestCentreKm : null,
    severity: data.severity === 'high' || data.severity === 'low' ? data.severity : 'medium',
    flaggedDaysAgo: count(data.flaggedDaysAgo),
    detail: text(data.detail),
    recommendedAction: text(data.recommendedAction),
  }
}

const TRAINING: TrainingStatus[] = ['new', 'recommended', 'enrolled', 'attending', 'irregular', 'certified', 'dropped']
const EMPLOYMENT: EmploymentStatus[] = ['in-training', 'seeking', 'placed', 'unplaced', 'not-tracked']

function toBeneficiary(id: string, data: Record<string, unknown>): Beneficiary {
  const attendance = data.attendance as { attended?: unknown; total?: unknown; sessions?: unknown } | undefined
  return {
    beneficiaryId: text(data.beneficiaryId, id),
    name: text(data.name, '—'),
    age: count(data.age),
    gender: data.gender === 'M' ? 'M' : 'F',
    primaryNumber: text(data.primaryNumber),
    secondaryNumber: typeof data.secondaryNumber === 'string' ? data.secondaryNumber : null,
    preferredLanguage: text(data.preferredLanguage, 'Hindi'),
    district: text(data.district),
    block: text(data.block),
    village: text(data.village),
    educationLevel: text(data.educationLevel),
    currentWork: text(data.currentWork),
    interests: list(data.interests),
    course: text(data.course),
    centre: typeof data.centre === 'string' ? data.centre : null,
    trainingStatus: TRAINING.includes(data.trainingStatus as TrainingStatus)
      ? (data.trainingStatus as TrainingStatus)
      : 'new',
    employmentStatus: EMPLOYMENT.includes(data.employmentStatus as EmploymentStatus)
      ? (data.employmentStatus as EmploymentStatus)
      : 'in-training',
    lastContactDays: count(data.lastContactDays),
    aiFlags: list(data.aiFlags),
    isStalled: data.isStalled === true,
    hasDialectGap: data.hasDialectGap === true,
    attendance:
      attendance && typeof attendance === 'object'
        ? {
            attended: count(attendance.attended),
            total: count(attendance.total),
            sessions: (Array.isArray(attendance.sessions) ? attendance.sessions : []).map((mark) =>
              mark === 'absent' ? 'absent' : 'present',
            ),
          }
        : null,
    calls: Array.isArray(data.calls) ? (data.calls as Beneficiary['calls']) : [],
    journey: Array.isArray(data.journey) ? (data.journey as Beneficiary['journey']) : [],
    outcome: text(data.outcome),
  }
}

function toSystemCall(id: string, data: Record<string, unknown>): SystemCall {
  const handler = data.handler === 'executive' || data.handler === 'resourcePerson' ? data.handler : 'ai'
  return {
    callId: text(data.callId, id),
    handler,
    handlerName: typeof data.handlerName === 'string' ? data.handlerName : null,
    beneficiaryId: text(data.beneficiaryId),
    beneficiaryName: text(data.beneficiaryName),
    district: text(data.district),
    block: text(data.block),
    whenLabel: text(data.whenLabel),
    daysAgo: count(data.daysAgo),
    durationSeconds: count(data.durationSeconds),
    detection: data.detection as SystemCall['detection'],
    summary: text(data.summary),
    subType: data.subType === 'course-related' || data.subType === 'common-related' ? data.subType : undefined,
    aiOutcome: data.aiOutcome as SystemCall['aiOutcome'],
    escalationReason: typeof data.escalationReason === 'string' ? data.escalationReason : undefined,
    confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
  }
}

function toFollowUp(id: string, data: Record<string, unknown>): FollowUpRecord {
  return {
    beneficiaryId: text(data.beneficiaryId, id),
    name: text(data.name),
    district: text(data.district),
    block: text(data.block),
    course: text(data.course),
    callCount: count(data.callCount),
    purpose: data.purpose as FollowUpRecord['purpose'],
    lastWhenLabel: text(data.lastWhenLabel),
    lastDaysAgo: count(data.lastDaysAgo),
    outcome: data.outcome as FollowUpRecord['outcome'],
    detail: text(data.detail),
    nextDueLabel: typeof data.nextDueLabel === 'string' ? data.nextDueLabel : null,
  }
}

function toCourse(id: string, data: Record<string, unknown>): CourseRecord {
  return {
    course: text(data.course, id),
    nsqfLevel: count(data.nsqfLevel, 3),
    jobRole: text(data.jobRole),
    minimumClass: count(data.minimumClass),
    needsLiteracy: data.needsLiteracy === true,
    homeBased: data.homeBased === true,
    needsSmartphone: data.needsSmartphone === true,
    durationWeeks: count(data.durationWeeks),
    whatYouLearn: text(data.whatYouLearn),
    toolsUsed: text(data.toolsUsed),
    typicalWork: text(data.typicalWork),
    // Absent stays absent: a missing earning figure is an escalation, never a guess.
    earningRange: typeof data.earningRange === 'string' ? data.earningRange : null,
    feeNote: text(data.feeNote),
  }
}

function toCentre(id: string, data: Record<string, unknown>): Centre {
  return {
    centreId: text(data.centreId, id),
    name: text(data.name),
    district: text(data.district),
    block: text(data.block),
    courses: list(data.courses),
    capacity: count(data.capacity),
    allotted: count(data.allotted),
    waiting: count(data.waiting),
    resourcePersonId: typeof data.resourcePersonId === 'string' ? data.resourcePersonId : null,
    resourcePersonName: typeof data.resourcePersonName === 'string' ? data.resourcePersonName : null,
    openedLabel: text(data.openedLabel),
  }
}

function toAttendance(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    attendanceId: text(data.attendanceId, id),
    beneficiaryId: text(data.beneficiaryId),
    centreId: text(data.centreId),
    batchId: text(data.batchId),
    course: text(data.course),
    sessionDate: text(data.sessionDate),
    sessionNumber: count(data.sessionNumber),
    mark: data.mark === 'absent' ? 'absent' : 'present',
    markedBy: text(data.markedBy),
  }
}

function toAdminFlag(id: string, data: Record<string, unknown>): AdminFlagRecord {
  return {
    flagId: text(data.flagId, id),
    beneficiaryId: text(data.beneficiaryId),
    name: text(data.name),
    district: text(data.district),
    block: text(data.block),
    course: text(data.course),
    reason: text(data.reason),
    note: text(data.note),
    raisedBy: text(data.raisedByName, text(data.raisedBy)),
    raisedLabel: text(data.raisedLabel),
    raisedDaysAgo: count(data.raisedDaysAgo),
    status: data.status === 'assigned' || data.status === 'resolved' ? data.status : 'open',
    assignedToId: typeof data.assignedToId === 'string' ? data.assignedToId : null,
    assignedToName: typeof data.assignedToName === 'string' ? data.assignedToName : null,
  }
}

/**
 * `allowEmpty` separates the two kinds of empty result. An unfiltered reference read that
 * comes back with nothing means the project was never seeded, so the sample is the better
 * answer. A filtered role read that comes back with nothing is a true answer — an
 * executive genuinely has no calls assigned yet — and showing them another official's
 * sample rows instead would be a lie.
 */
const REASONS: ReasonTag[] = [
  'ai-low-confidence',
  'beneficiary-requested-human',
  'course-question',
  'placement',
  'self-employment',
  'followup-unable-to-manage',
]

function toQueuedCall(id: string, data: Record<string, unknown>): QueuedCall {
  const ai = (data.ai ?? {}) as QueuedCall['ai']
  return {
    callId: text(data.callId, id),
    beneficiaryId: text(data.beneficiaryId),
    district: text(data.district),
    block: text(data.block),
    detection: data.detection as QueuedCall['detection'],
    reasonTag: REASONS.includes(data.reasonTag as ReasonTag) ? (data.reasonTag as ReasonTag) : 'course-question',
    reasonDetail: text(data.reasonDetail),
    subType: data.subType === 'course-related' || data.subType === 'common-related' ? data.subType : undefined,
    transferredFrom: typeof data.transferredFrom === 'string' ? data.transferredFrom : undefined,
    waitedSeconds: count(data.waitedSeconds),
    ai,
    draftDiscussion: text(data.draftDiscussion),
    draftActions: list(data.draftActions),
    draftOutcome: data.draftOutcome as OutcomeKey,
    draftCourse: text(data.draftCourse),
  }
}

function toCompletedCall(id: string, data: Record<string, unknown>): CompletedCall {
  return {
    callId: text(data.callId, id),
    ref: text(data.ref),
    subType: data.subType === 'course-related' || data.subType === 'common-related' ? data.subType : undefined,
    detection: data.detection as CompletedCall['detection'],
    whenLabel: text(data.whenLabel),
    daysAgo: count(data.daysAgo),
    durationSeconds: count(data.durationSeconds),
    discussion: text(data.discussion),
    course: text(data.course),
    actions: list(data.actions),
    outcome: data.outcome as OutcomeKey,
  }
}

async function loadCollection<T>(
  name: SlotName,
  path: string,
  map: (id: string, data: Record<string, unknown>) => T,
  constraints: QueryConstraint[] = [],
  allowEmpty = false,
): Promise<void> {
  markLoading(name)
  try {
    const snapshot = await getDocs(query(collection(db, path), ...constraints, limit(LIMITS[name])))
    if (snapshot.empty && !allowEmpty) {
      markFailed(name, 'empty')
      return
    }
    fillFromFirestore(
      name,
      snapshot.docs.map((document) => map(document.id, document.data() as Record<string, unknown>)),
    )
  } catch (error) {
    markFailed(name, error instanceof Error ? error.message : 'unknown')
  }
}

/**
 * Everything an admin may read (spec 7.1: the admin sees all).
 * Failures are recorded per collection, never thrown — one bad query must not take the
 * other seven down with it.
 */
export async function loadAdminData(): Promise<void> {
  await Promise.all([
    loadCollection('gaps', 'gapData', toGap),
    loadCollection('beneficiaries', 'beneficiaries', toBeneficiary),
    loadCollection('calls', 'calls', toSystemCall, [where('recordType', '==', 'system')]),
    loadCollection('followUps', 'followUps', toFollowUp),
    loadCollection('courses', 'courses', toCourse),
    loadCollection('centres', 'centres', toCentre),
    loadCollection('attendance', 'attendance', toAttendance),
    loadCollection('adminFlags', 'adminFlags', toAdminFlag),
  ])
}

/**
 * What an executive may read: the waiting queue and their own calls, plus the course and
 * centre reference data every staff member can see. Two queries rather than an `or`,
 * because each half is a plain equality pair the rules allow.
 */
export async function loadExecutiveData(uid: string): Promise<void> {
  await Promise.all([
    // The queue carries no handler yet — spec 7.2: any executive may take the next call.
    // status is filtered as well as stored: a `list` is checked against the query rather
    // than the documents, so a rule that reads resource.data.status is only satisfiable
    // when the query constrains it.
    loadCollection(
      'queue',
      'calls',
      toQueuedCall,
      [
        where('recordType', '==', 'queued'),
        where('callType', '==', 'executive'),
        where('status', '==', 'waiting'),
      ],
      true,
    ),
    loadCollection(
      'completed',
      'calls',
      toCompletedCall,
      [
        where('recordType', '==', 'completed'),
        where('callType', '==', 'executive'),
        where('handledBy', '==', uid),
      ],
      true,
    ),
    loadCollection('courses', 'courses', toCourse),
    loadCollection('centres', 'centres', toCentre),
  ])
}

/** What a resource person may read: their own trainees, calls, attendance and flags. */
export async function loadResourcePersonData(uid: string): Promise<void> {
  await Promise.all([
    loadCollection('beneficiaries', 'beneficiaries', toBeneficiary, [where('assignedResourcePerson', '==', uid)], true),
    loadCollection(
      'rpQueue',
      'calls',
      toQueuedCall,
      [
        where('recordType', '==', 'queued'),
        where('callType', '==', 'resourcePerson'),
        where('assignedTo', '==', uid),
      ],
      true,
    ),
    loadCollection(
      'rpCompleted',
      'calls',
      toCompletedCall,
      [
        where('recordType', '==', 'completed'),
        where('callType', '==', 'resourcePerson'),
        where('assignedTo', '==', uid),
      ],
      true,
    ),
    loadCollection('attendance', 'attendance', toAttendance, [where('markedBy', '==', uid)], true),
    loadCollection('adminFlags', 'adminFlags', toAdminFlag, [where('raisedBy', '==', uid)], true),
    loadCollection('courses', 'courses', toCourse),
    loadCollection('centres', 'centres', toCentre),
  ])
}

