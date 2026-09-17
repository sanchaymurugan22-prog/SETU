/**
 * Sample data for the Admin console's oversight sections: staff, every call in the
 * system, the automated follow-up engine, courses and centres, and flagged cases.
 *
 * All of it is derived from the beneficiaries and gap blocks already seeded, so the
 * numbers agree with what the other sections show: the same people, the same centres,
 * the same courses. Nothing here invents a second version of the truth.
 *
 * In production each export maps to a Firestore collection (SETU-SPEC.md Part 8):
 * users, calls, followUps, courses, centres, adminFlags.
 */

import { detected } from './languageDetections'
import { loadBeneficiaries, type Beneficiary } from './jharkhandBeneficiaries'
import { loadBlockGaps } from './jharkhandGaps'
import { RESOURCE_PERSONS } from './jharkhandCalls'
import type { LanguageDetection } from '../lib/languageDetection'

const people = loadBeneficiaries()

/** Same deterministic PRNG the other seed modules use. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function pickFrom<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!
}

/** Rough "n days ago" label against the fixed reporting date. */
const REPORT_DATE = new Date('2026-09-16T00:00:00Z')

function dayLabel(daysAgo: number): string {
  const date = new Date(REPORT_DATE.getTime() - daysAgo * 86_400_000)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function timeLabel(daysAgo: number, minuteSeed: number): string {
  const hour = 9 + (minuteSeed % 8)
  const minute = (minuteSeed * 7) % 60
  return `${dayLabel(daysAgo)} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/* ─────────────────────────── Staff ─────────────────────────── */

export interface CallExecutive {
  userId: string
  name: string
  email: string
  district: string
  /** Deactivated accounts keep their history but cannot sign in (SETU-SPEC 6.2). */
  active: boolean
  joinedLabel: string
  callsHandled: number
  reportsSent: number
  transfersOut: number
  avgHandleSeconds: number
  lastActiveLabel: string
}

export const CALL_EXECUTIVES: CallExecutive[] = [
  {
    userId: 'exec-mahato',
    name: 'A. Mahato',
    email: 'a.mahato@setu.gov.in',
    district: 'Ranchi',
    active: true,
    joinedLabel: '12 Feb 2026',
    callsHandled: 412,
    reportsSent: 412,
    transfersOut: 63,
    avgHandleSeconds: 447,
    lastActiveLabel: 'Today',
  },
  {
    userId: 'exec-kujur',
    name: 'P. Kujur',
    email: 'p.kujur@setu.gov.in',
    district: 'Gumla',
    active: true,
    joinedLabel: '3 Mar 2026',
    callsHandled: 368,
    reportsSent: 366,
    transfersOut: 51,
    avgHandleSeconds: 401,
    lastActiveLabel: 'Today',
  },
  {
    userId: 'exec-hembrom',
    name: 'S. Hembrom',
    email: 's.hembrom@setu.gov.in',
    district: 'East Singhbhum',
    active: true,
    joinedLabel: '21 Mar 2026',
    callsHandled: 295,
    reportsSent: 294,
    transfersOut: 39,
    avgHandleSeconds: 512,
    lastActiveLabel: 'Yesterday',
  },
  {
    userId: 'exec-toppo',
    name: 'N. Toppo',
    email: 'n.toppo@setu.gov.in',
    district: 'Khunti',
    active: true,
    joinedLabel: '8 Apr 2026',
    callsHandled: 187,
    reportsSent: 187,
    transfersOut: 24,
    avgHandleSeconds: 468,
    lastActiveLabel: '2 days ago',
  },
  {
    userId: 'exec-lakra',
    name: 'D. Lakra',
    email: 'd.lakra@setu.gov.in',
    district: 'Lohardaga',
    active: false,
    joinedLabel: '19 Jan 2026',
    callsHandled: 96,
    reportsSent: 96,
    transfersOut: 11,
    avgHandleSeconds: 523,
    lastActiveLabel: '6 weeks ago',
  },
]

export interface ResourcePersonRecord {
  userId: string
  name: string
  email: string
  district: string
  block: string
  centre: string
  courses: string[]
  active: boolean
  joinedLabel: string
  traineeCount: number
  certifiedCount: number
  callsHandled: number
  lastActiveLabel: string
}

const RP_CENTRES: Record<string, { district: string; centre: string; courses: string[] }> = {
  Ghaghra: { district: 'Gumla', centre: 'Ghaghra Training Centre', courses: ['Tailoring L1', 'Tailoring L2'] },
  Angara: { district: 'Ranchi', centre: 'Angara Works Centre', courses: ['Welding L1', 'Welding L2'] },
  Hussainabad: { district: 'Palamu', centre: 'Hussainabad ITI Annexe', courses: ['Electrical wiring'] },
  Torpa: { district: 'Khunti', centre: 'Torpa Transport Centre', courses: ['Driving (LMV)'] },
}

export const RESOURCE_PERSON_RECORDS: ResourcePersonRecord[] = RESOURCE_PERSONS.map((person, index) => {
  const posting = RP_CENTRES[person.block]!
  // Their trainees are the ones at their own centre, or in their block on their courses
  // where the seeded beneficiary record names a different centre in the same place.
  const trainees = people.filter(
    (entry) =>
      entry.centre === posting.centre ||
      (entry.block === person.block && entry.centre !== null && posting.courses.includes(entry.course)),
  )
  return {
    userId: person.userId,
    name: person.name,
    email: `${person.name.toLowerCase().replace(/[^a-z]/g, '')}@setu.gov.in`,
    district: posting.district,
    block: person.block,
    centre: posting.centre,
    courses: posting.courses,
    active: true,
    joinedLabel: pickFrom(['4 Jan 2026', '18 Feb 2026', '2 Mar 2026', '27 Mar 2026'], index),
    traineeCount: trainees.length,
    certifiedCount: trainees.filter((entry) => entry.trainingStatus === 'certified').length,
    callsHandled: 48 + index * 27,
    lastActiveLabel: pickFrom(['Today', 'Today', 'Yesterday', '3 days ago'], index),
  }
})

/** Officers an admin can send a flagged case to. */
export const FIELD_OFFICERS = [
  { userId: 'officer-minz', name: 'K. Minz', role: 'Block welfare officer', district: 'Gumla' },
  { userId: 'officer-oraon', name: 'J. Oraon', role: 'District social welfare officer', district: 'Ranchi' },
  { userId: 'officer-das', name: 'T. Das', role: 'Placement coordinator', district: 'Bokaro' },
  { userId: 'officer-tirkey', name: 'L. Tirkey', role: 'Field counsellor', district: 'Khunti' },
]

/* ─────────────────────── Calls across the system ─────────────────────── */

export type CallHandler = 'ai' | 'executive' | 'resourcePerson'

export const CALL_HANDLERS: CallHandler[] = ['executive', 'resourcePerson', 'ai']

/** What an AI call ended as (SETU-SPEC 6.4 Part C). */
export type AiOutcome = 'fully-handled' | 'escalated' | 'follow-up' | 'failed'

export const AI_OUTCOMES: AiOutcome[] = ['fully-handled', 'escalated', 'follow-up', 'failed']

export interface SystemCall {
  callId: string
  handler: CallHandler
  /** Null for AI calls: nobody handled them, which is the point. */
  handlerName: string | null
  /** Masked beneficiary reference — the admin can see identity, but the list stays scannable. */
  beneficiaryId: string
  beneficiaryName: string
  district: string
  block: string
  whenLabel: string
  daysAgo: number
  durationSeconds: number
  detection: LanguageDetection
  summary: string
  /** Course-related or common-related, on resource-person calls only. */
  subType?: 'course-related' | 'common-related'
  aiOutcome?: AiOutcome
  escalationReason?: string
  /** The AI's own confidence in how it handled the call. */
  confidence?: number
}

const AI_SUMMARIES = [
  'Routine check-in: attending regularly, no problems reported.',
  'Asked what documents the centre needs on the first day. Answered from the course record.',
  'Confirmed the new batch timing and repeated it back.',
  'Reported a travel problem; a nearer centre was offered and accepted.',
  'Asked about the stipend. Explained what PM-AJAY covers and what it does not.',
  'Follow-up after certification: asked whether any work had come up yet.',
  'Caller went quiet after the greeting; call ended without a usable answer.',
  'Asked to speak to a person about a family matter affecting attendance.',
]

const ESCALATION_REASONS = [
  'Caller asked for a person',
  'Detection contested — language outside the supported set',
  'Question outside the course record',
  'Dissatisfaction expressed twice',
  'Three failed attempts to capture the answer',
]

const EXEC_SUMMARIES = [
  'Re-enrolled after a dropped batch; seat moved to the nearer centre.',
  'Explained the assessment and what the certificate is worth to employers.',
  'Recorded a travel-cost problem and raised it with the block office.',
  'Corrected the phone number and consent on the record.',
  'Transferred to a resource person for a trade-specific question.',
]

const RP_SUMMARIES = [
  'Explained where the certificate is recognised and what the work pays.',
  'Moved the trainee to the afternoon batch after a timing clash.',
  'Compared two trades for someone unsure which to take.',
  'Talked through a dropout risk with the trainee directly.',
]

function buildSystemCalls(): SystemCall[] {
  const calls: SystemCall[] = []
  const source = mulberry32(20_260_918)

  people.forEach((person, index) => {
    // Every beneficiary has been called by the AI at least once; some several times.
    const aiCalls = 1 + Math.floor(source() * 3)
    for (let call = 0; call < aiCalls; call += 1) {
      const roll = source()
      const aiOutcome: AiOutcome =
        roll < 0.72 ? 'fully-handled' : roll < 0.85 ? 'follow-up' : roll < 0.96 ? 'escalated' : 'failed'
      const daysAgo = 1 + Math.floor(source() * 60)
      const contested = person.hasDialectGap
      calls.push({
        callId: `ai-${person.beneficiaryId}-${call}`,
        handler: 'ai',
        handlerName: null,
        beneficiaryId: person.beneficiaryId,
        beneficiaryName: person.name,
        district: person.district,
        block: person.block,
        whenLabel: timeLabel(daysAgo, index + call),
        daysAgo,
        durationSeconds: 95 + Math.floor(source() * 180),
        detection: detected(person.preferredLanguage, index * 5 + call),
        summary: pickFrom(AI_SUMMARIES, index + call),
        aiOutcome,
        escalationReason:
          aiOutcome === 'escalated'
            ? contested
              ? ESCALATION_REASONS[1]
              : pickFrom(ESCALATION_REASONS, index)
            : undefined,
        confidence: Number((aiOutcome === 'failed' ? 0.3 + source() * 0.2 : 0.62 + source() * 0.37).toFixed(2)),
      })
    }

    // Roughly one in five reached an executive.
    if (source() < 0.22) {
      const daysAgo = 1 + Math.floor(source() * 45)
      const executive = pickFrom(CALL_EXECUTIVES.filter((entry) => entry.active), index)
      calls.push({
        callId: `exec-${person.beneficiaryId}`,
        handler: 'executive',
        handlerName: executive.name,
        beneficiaryId: person.beneficiaryId,
        beneficiaryName: person.name,
        district: person.district,
        block: person.block,
        whenLabel: timeLabel(daysAgo, index + 3),
        daysAgo,
        durationSeconds: 280 + Math.floor(source() * 400),
        detection: detected(person.preferredLanguage, index * 7),
        summary: pickFrom(EXEC_SUMMARIES, index),
      })
    }

    // A smaller share went on to a resource person.
    if (source() < 0.09) {
      const daysAgo = 1 + Math.floor(source() * 40)
      const expert = pickFrom(RESOURCE_PERSON_RECORDS, index)
      calls.push({
        callId: `rp-${person.beneficiaryId}`,
        handler: 'resourcePerson',
        handlerName: expert.name,
        beneficiaryId: person.beneficiaryId,
        beneficiaryName: person.name,
        district: person.district,
        block: person.block,
        whenLabel: timeLabel(daysAgo, index + 5),
        daysAgo,
        durationSeconds: 320 + Math.floor(source() * 380),
        detection: detected(person.preferredLanguage, index * 11),
        summary: pickFrom(RP_SUMMARIES, index),
        subType: source() < 0.6 ? 'course-related' : 'common-related',
      })
    }
  })

  return calls.sort((a, b) => a.daysAgo - b.daysAgo)
}

const SYSTEM_CALLS = buildSystemCalls()

export function loadSystemCalls(): SystemCall[] {
  return SYSTEM_CALLS
}

export interface FunnelSlice {
  handler: CallHandler
  calls: number
  /** Percentage of all calls, one decimal place. */
  share: number
}

/**
 * The automation funnel: what share of calls the AI closed without a human.
 * This is the scalability number (SETU-SPEC 6.4).
 */
export function automationFunnel(calls: SystemCall[] = SYSTEM_CALLS): FunnelSlice[] {
  const total = calls.length
  return CALL_HANDLERS.map((handler) => {
    const count = calls.filter((call) => call.handler === handler).length
    return { handler, calls: count, share: total === 0 ? 0 : Math.round((count / total) * 1000) / 10 }
  })
}

/** How AI calls ended, for the outcome breakdown beside the funnel. */
export function aiOutcomeCounts(calls: SystemCall[] = SYSTEM_CALLS): { outcome: AiOutcome; calls: number }[] {
  const aiCalls = calls.filter((call) => call.handler === 'ai')
  return AI_OUTCOMES.map((outcome) => ({
    outcome,
    calls: aiCalls.filter((call) => call.aiOutcome === outcome).length,
  }))
}

/* ─────────────────── Follow-up reports (the automated engine) ─────────────────── */

export type FollowUpPurpose =
  | 'did-you-enroll'
  | 'are-you-attending'
  | 'any-problem'
  | 'did-you-get-placed'
  | 're-engagement'

export const FOLLOW_UP_PURPOSES: FollowUpPurpose[] = [
  'did-you-enroll',
  'are-you-attending',
  'any-problem',
  'did-you-get-placed',
  're-engagement',
]

export type FollowUpOutcome = 'answered' | 'no-answer' | 'problem-found' | 'escalated'

export const FOLLOW_UP_OUTCOMES: FollowUpOutcome[] = ['answered', 'no-answer', 'problem-found', 'escalated']

export interface FollowUpRecord {
  beneficiaryId: string
  name: string
  district: string
  block: string
  course: string
  /** How many follow-up calls the engine has made to this person. */
  callCount: number
  purpose: FollowUpPurpose
  lastWhenLabel: string
  lastDaysAgo: number
  outcome: FollowUpOutcome
  detail: string
  /** Null once the person is certified and placed: nothing left to ask. */
  nextDueLabel: string | null
}

/** Which question the engine asks next, from where the person has reached. */
function purposeFor(person: Beneficiary): FollowUpPurpose {
  if (person.trainingStatus === 'recommended' || person.trainingStatus === 'new') return 'did-you-enroll'
  if (person.trainingStatus === 'dropped') return 're-engagement'
  if (person.trainingStatus === 'irregular') return 'any-problem'
  if (person.trainingStatus === 'certified') return 'did-you-get-placed'
  return 'are-you-attending'
}

const FOLLOW_UP_DETAIL: Record<FollowUpPurpose, string> = {
  'did-you-enroll': 'Asked whether the seat was taken up and the first session attended.',
  'are-you-attending': 'Routine attendance check; nothing needed from a human.',
  'any-problem': 'Asked what is getting in the way of coming to sessions.',
  'did-you-get-placed': 'Asked whether any work has come up since certification.',
  're-engagement': 'Offered a fresh recommendation after dropping out.',
}

function buildFollowUps(): FollowUpRecord[] {
  const source = mulberry32(20_260_919)
  return people
    // The engine calls everyone it has something to ask — which is everyone past intake.
    .filter((person) => person.trainingStatus !== 'new' || person.lastContactDays < 30)
    .map((person, index) => {
      const purpose = purposeFor(person)
      const roll = source()
      const outcome: FollowUpOutcome =
        person.isStalled && roll < 0.55
          ? 'no-answer'
          : person.aiFlags.length > 0 && roll < 0.75
            ? 'problem-found'
            : roll < 0.08
              ? 'escalated'
              : 'answered'
      return {
        beneficiaryId: person.beneficiaryId,
        name: person.name,
        district: person.district,
        block: person.block,
        course: person.course,
        callCount: 1 + Math.floor(source() * 6),
        purpose,
        lastWhenLabel: timeLabel(person.lastContactDays, index),
        lastDaysAgo: person.lastContactDays,
        outcome,
        detail: FOLLOW_UP_DETAIL[purpose],
        nextDueLabel:
          person.employmentStatus === 'placed'
            ? null
            : dayLabel(Math.max(0, person.lastContactDays - 14 - Math.floor(source() * 10))),
      }
    })
}

const FOLLOW_UPS = buildFollowUps()

export function loadFollowUps(): FollowUpRecord[] {
  return FOLLOW_UPS
}

/* ─────────────────────── Courses and centres ─────────────────────── */

export interface Centre {
  centreId: string
  name: string
  district: string
  block: string
  courses: string[]
  capacity: number
  /** Seats currently taken by allotted trainees. */
  allotted: number
  /** People in this block waiting for a seat on one of its courses. */
  waiting: number
  resourcePersonId: string | null
  resourcePersonName: string | null
  openedLabel: string
}

export interface CourseRecord {
  course: string
  nsqfLevel: string
  centres: number
  enrolled: number
  allotted: number
  waiting: number
  /** Blocks where this course is wanted but has no centre — straight from the gap map. */
  demandBlocks: number
}

function buildCentres(): Centre[] {
  const source = mulberry32(20_260_920)
  const byCentre = new Map<string, Beneficiary[]>()
  for (const person of people) {
    if (!person.centre) continue
    byCentre.set(person.centre, [...(byCentre.get(person.centre) ?? []), person])
  }

  // Every posting is a centre, even where no seeded beneficiary names it yet — otherwise
  // a block with a resource person would still show up as unserved.
  for (const posting of Object.values(RP_CENTRES)) {
    if (byCentre.has(posting.centre)) continue
    const local = people.filter(
      (person) => person.block === Object.keys(RP_CENTRES).find((block) => RP_CENTRES[block] === posting),
    )
    byCentre.set(posting.centre, local)
  }

  return [...byCentre.entries()].map(([name, members], index) => {
    const postingBlock = Object.keys(RP_CENTRES).find((block) => RP_CENTRES[block]!.centre === name)
    const posting = postingBlock ? RP_CENTRES[postingBlock]! : null
    const first = members[0] ?? null
    const courses = [...new Set([...members.map((person) => person.course), ...(posting?.courses ?? [])])]
    const allotted = members.filter((person) => person.trainingStatus !== 'dropped').length
    const expert = RESOURCE_PERSON_RECORDS.find((person) => person.centre === name) ?? null
    const block = first?.block ?? postingBlock ?? '—'
    const district = first?.district ?? posting?.district ?? '—'
    // Waiting is demand in the same block that has no seat yet.
    const waiting = people.filter(
      (person) => person.block === block && person.centre === null && courses.includes(person.course),
    ).length
    return {
      centreId: `centre-${index + 1}`,
      name,
      district,
      block,
      courses,
      capacity: allotted + 4 + Math.floor(source() * 10),
      allotted,
      waiting,
      resourcePersonId: expert?.userId ?? null,
      resourcePersonName: expert?.name ?? null,
      openedLabel: pickFrom(['14 Jan 2026', '2 Feb 2026', '19 Feb 2026', '8 Mar 2026', '26 Mar 2026'], index),
    }
  })
}

const CENTRES = buildCentres()

export function loadCentres(): Centre[] {
  return CENTRES
}

const NSQF_BY_COURSE: Record<string, string> = {
  'Tailoring L1': '3',
  'Tailoring L2': '4',
  'Welding L1': '3',
  'Welding L2': '4',
  'Electrical wiring': '3',
  'Mobile repair': '4',
  Masonry: '3',
  'Food processing': '3',
  'Beauty & wellness': '3',
  'Driving (LMV)': '3',
}

export function loadCourses(): CourseRecord[] {
  const gaps = loadBlockGaps()
  const names = [...new Set(people.map((person) => person.course))].sort()
  return names.map((course) => {
    const learners = people.filter((person) => person.course === course)
    const centres = CENTRES.filter((centre) => centre.courses.includes(course))
    return {
      course,
      nsqfLevel: NSQF_BY_COURSE[course] ?? '—',
      centres: centres.length,
      enrolled: learners.filter((person) => person.centre !== null).length,
      allotted: learners.filter((person) => person.centre !== null && person.trainingStatus !== 'dropped').length,
      waiting: learners.filter((person) => person.centre === null).length,
      demandBlocks: gaps.filter((gap) => gap.course === course && gap.gapType === 'no-centre').length,
    }
  })
}

/**
 * Where a new centre would go, and who is waiting for it. The spec's auto-allotment
 * rule: when the centres serving a block are full, the admin opens one and the waiting
 * list moves across with a resource person attached.
 */
export interface AllotmentSuggestion {
  block: string
  district: string
  course: string
  /** Block-level demand from the gap data, not the seeded beneficiary count. */
  demand: number
  nearestCentreKm: number | null
  /** True when every centre that could take them is already at capacity. */
  centresFull: boolean
}

export function allotmentSuggestions(): AllotmentSuggestion[] {
  return loadBlockGaps()
    .filter((gap) => gap.gapType === 'no-centre')
    // A block that has since had a centre opened for that course is no longer waiting —
    // Ghaghra, for instance, is a gap block in the historical data and a live centre now.
    .filter(
      (gap) => !CENTRES.some((centre) => centre.block === gap.block && centre.courses.includes(gap.course)),
    )
    .map((gap) => ({
      block: gap.block,
      district: gap.district,
      course: gap.course,
      demand: gap.demandCount,
      nearestCentreKm: gap.nearestCentreKm,
      centresFull: CENTRES.filter((centre) => centre.courses.includes(gap.course)).every(
        (centre) => centre.allotted >= centre.capacity - 2,
      ),
    }))
    .sort((a, b) => b.demand - a.demand)
}

/* ─────────────────────────── Admin flags ─────────────────────────── */

export type FlagStatus = 'open' | 'assigned' | 'resolved'

export const FLAG_STATUSES: FlagStatus[] = ['open', 'assigned', 'resolved']

export interface AdminFlagRecord {
  flagId: string
  beneficiaryId: string
  name: string
  district: string
  block: string
  course: string
  reason: string
  note: string
  raisedBy: string
  raisedLabel: string
  raisedDaysAgo: number
  status: FlagStatus
  assignedToId: string | null
  assignedToName: string | null
}

const FLAG_REASON_LABELS = [
  'repeated-absence',
  'travel-cost',
  'family-pressure',
  'no-local-work',
  'needs-field-visit',
] as const

/** The note has to match the reason it is filed under, or the card contradicts itself. */
const FLAG_NOTES: Record<(typeof FLAG_REASON_LABELS)[number], string> = {
  'repeated-absence': 'Absent four sessions running. No answer on either number since the second one.',
  'travel-cost': 'Travel cost is the whole problem — three buses each way, no direct route.',
  'family-pressure': 'Wants to continue but the household is against it. Needs someone to speak to them.',
  'no-local-work': 'Certified in March, still no work in the block. Asking what else is on offer.',
  'needs-field-visit': 'Something has changed at home that she will not discuss by phone. Worth a visit.',
}

function buildFlags(): AdminFlagRecord[] {
  const source = mulberry32(20_260_921)
  // Flags come from the people a resource person would actually escalate — and from a
  // spread of situations, not four of the same kind, because the unplaced dominate the
  // flagged population and would otherwise fill the whole board.
  const enrolled = people.filter((person) => person.centre !== null)
  const take = (predicate: (person: Beneficiary) => boolean, count: number) =>
    enrolled.filter(predicate).slice(0, count)

  const candidates = [
    ...take((person) => person.employmentStatus === 'unplaced', 4),
    ...take((person) => person.trainingStatus === 'dropped', 4),
    ...take((person) => person.trainingStatus === 'irregular', 3),
    ...take((person) => person.isStalled && person.trainingStatus !== 'dropped', 3),
  ].filter((person, index, list) => list.findIndex((entry) => entry.beneficiaryId === person.beneficiaryId) === index)

  return candidates.map((person, index) => {
    const roll = source()
    const status: FlagStatus = roll < 0.4 ? 'open' : roll < 0.75 ? 'assigned' : 'resolved'
    const officer = pickFrom(FIELD_OFFICERS, index)
    const raisedDaysAgo = 1 + Math.floor(source() * 24)
    const expert = RESOURCE_PERSON_RECORDS.find((entry) => entry.courses.includes(person.course))
    // The reason follows the record: an unplaced trainee is flagged for no local work,
    // someone who stopped answering for repeated absence.
    const reason =
      person.employmentStatus === 'unplaced'
        ? 'no-local-work'
        : person.trainingStatus === 'dropped'
          ? 'family-pressure'
          : person.trainingStatus === 'irregular'
            ? pickFrom(['repeated-absence', 'travel-cost'] as const, index)
            : 'needs-field-visit'
    return {
      flagId: `flag-${index + 1}`,
      beneficiaryId: person.beneficiaryId,
      name: person.name,
      district: person.district,
      block: person.block,
      course: person.course,
      reason,
      note: FLAG_NOTES[reason],
      raisedBy: expert?.name ?? RESOURCE_PERSON_RECORDS[0]!.name,
      raisedLabel: dayLabel(raisedDaysAgo),
      raisedDaysAgo,
      status,
      assignedToId: status === 'open' ? null : officer.userId,
      assignedToName: status === 'open' ? null : officer.name,
    }
  })
}

const FLAGS = buildFlags()

export function loadAdminFlags(): AdminFlagRecord[] {
  return FLAGS
}
