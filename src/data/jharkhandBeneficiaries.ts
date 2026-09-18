/**
 * Sample beneficiaries for the Admin console.
 *
 * Every person here is fictional. They are seeded from the same blocks as the
 * Opportunity Gap Map (see jharkhandGaps.ts), so the two sections tell one story: a
 * block flagged "60 want tailoring, no centre" has callers waiting for that course, and
 * a block flagged "trained, no local jobs" has certified people sitting unplaced.
 *
 * Generation is seeded and deterministic — the same list every reload, so counts on
 * screen never drift. In production this is the `beneficiaries` collection
 * (SETU-SPEC.md 8.1); `loadBeneficiaries()` is the single seam to swap for that query.
 */

import { loadBlockGaps, type BlockGap } from './jharkhandGaps'
import { readSlot, registerSample } from './source'

/**
 * Where someone is in their training. There is no separate "completed" stage: finishing
 * the course is what issues the certificate, so Certified means both.
 */
export type TrainingStatus =
  | 'new'
  | 'recommended'
  | 'enrolled'
  | 'attending'
  | 'irregular'
  | 'certified'
  | 'dropped'

/**
 * Whether that training turned into work. Kept apart from training on purpose: a trainee
 * is Certified AND Unplaced at the same time, and that pair is what the Opportunity Gap
 * Map counts as trained-but-unplaced.
 */
export type EmploymentStatus = 'in-training' | 'seeking' | 'placed' | 'unplaced' | 'not-tracked'

export const TRAINING_ORDER: TrainingStatus[] = [
  'new',
  'recommended',
  'enrolled',
  'attending',
  'irregular',
  'certified',
  'dropped',
]

export const EMPLOYMENT_ORDER: EmploymentStatus[] = ['in-training', 'seeking', 'placed', 'unplaced', 'not-tracked']

type Tone = 'neutral' | 'cyan' | 'amber' | 'teal' | 'magenta' | 'bright'

/** Chip colour family for each status. */
export const TRAINING_TONE: Record<TrainingStatus, Tone> = {
  new: 'neutral',
  recommended: 'neutral',
  enrolled: 'cyan',
  attending: 'cyan',
  irregular: 'amber',
  certified: 'teal',
  dropped: 'bright',
}

export const EMPLOYMENT_TONE: Record<EmploymentStatus, Tone> = {
  'in-training': 'neutral',
  seeking: 'cyan',
  placed: 'teal',
  unplaced: 'magenta',
  'not-tracked': 'neutral',
}

/**
 * The seed generator still thinks in one combined stage, because a person's story —
 * their calls, attendance and journey — follows that single thread. It is split into the
 * two public fields at the end of build().
 */
type SeedStage = TrainingStatus | 'placed' | 'trained-unplaced'

function splitStage(stage: SeedStage): { trainingStatus: TrainingStatus; employmentStatus: EmploymentStatus } {
  switch (stage) {
    case 'placed':
      return { trainingStatus: 'certified', employmentStatus: 'placed' }
    case 'trained-unplaced':
      return { trainingStatus: 'certified', employmentStatus: 'unplaced' }
    case 'certified':
      return { trainingStatus: 'certified', employmentStatus: 'seeking' }
    case 'dropped':
      return { trainingStatus: 'dropped', employmentStatus: 'not-tracked' }
    default:
      return { trainingStatus: stage, employmentStatus: 'in-training' }
  }
}

export type SessionMark = 'present' | 'absent'

export interface JourneyEvent {
  title: string
  detail: string
  when: string
  tone: 'normal' | 'alert' | 'pending'
  sessions?: SessionMark[]
}

export interface CallRecord {
  when: string
  handledBy: 'ai' | 'executive' | 'resourcePerson'
  summary: string
  outcome: string
}

export interface Beneficiary {
  beneficiaryId: string
  name: string
  age: number
  gender: 'F' | 'M'
  primaryNumber: string
  secondaryNumber: string | null
  preferredLanguage: string
  district: string
  block: string
  village: string
  educationLevel: string
  currentWork: string
  interests: string[]
  course: string
  centre: string | null
  trainingStatus: TrainingStatus
  employmentStatus: EmploymentStatus
  lastContactDays: number
  aiFlags: string[]
  isStalled: boolean
  hasDialectGap: boolean
  attendance: { attended: number; total: number; sessions: SessionMark[] } | null
  calls: CallRecord[]
  journey: JourneyEvent[]
  outcome: string

  /* Written from the consoles. Absent on a seeded record, where the trainer view
     derives an equivalent from the status — a stored value always wins over that. */

  /** Which resource person's trainee list this person appears on. */
  assignedResourcePerson?: string | null
  /** Every status change the trainer made, each with the description they had to write. */
  statusHistory?: { status: TrainingStatus; description: string; whenLabel: string }[]
  /** What the trainer recommends next, recorded when they certify. */
  completionRecommendation?: { nextCourse: string | null; jobRecommendation: string | null } | null
  certificateId?: string | null
  certificateIssuedAt?: string | null
  /** 'ai-call' when the voice line met this person; absent on a seeded record. */
  createdBy?: string
}

/** Fixed reporting date, so every derived date and count stays stable. */
const REPORT_DATE = new Date('2026-09-16T00:00:00Z')

function dateLabel(daysAgo: number): string {
  const date = new Date(REPORT_DATE.getTime() - daysAgo * 86_400_000)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function lastContactLabel(days: number): string {
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

/** Small deterministic PRNG, so the sample never changes between reloads. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

const FEMALE_FIRST = ['Sunita', 'Phulmani', 'Kamla', 'Sita', 'Anita', 'Rekha', 'Manju', 'Budhni', 'Pushpa', 'Lalita', 'Chandmani', 'Jasinta', 'Sarita', 'Mangri', 'Etwari', 'Somari']
const MALE_FIRST = ['Ramesh', 'Birsa', 'Mahadev', 'Jagarnath', 'Dinesh', 'Sanjay', 'Mangal', 'Etwa', 'Bandhan', 'Sukhram', 'Jitan', 'Birju', 'Rajesh', 'Turam', 'Somra', 'Baiju']
const SURNAMES = ['Oraon', 'Munda', 'Mahto', 'Kachhap', 'Lohra', 'Baraik', 'Bhagat', 'Devi', 'Kumari', 'Tirkey', 'Toppo', 'Hembrom', 'Soren', 'Murmu', 'Hansda', 'Singh', 'Prasad', 'Ansari', 'Kujur', 'Minz']

const VILLAGES = ['Barwadih', 'Kutmu', 'Nawadih', 'Serengdag', 'Sikidiri', 'Chhapri', 'Dhab', 'Kandra', 'Hesag', 'Marcha', 'Pelawal', 'Kamdara', 'Bariatu', 'Jaltanda', 'Sahoda', 'Rengarih', 'Tetartoli', 'Karmatoli', 'Bhelwara', 'Chotkitand']

const EDUCATION = ['Never attended school', 'Class 3 · reads a little', 'Class 5 · reads a little', 'Class 8', 'Class 10', 'Class 12']
const WORK = ['Daily-wage labour', 'Farm labour, seasonal', 'Household work', 'Small farming', 'Helper at a shop', 'No work at present', 'Brick kiln, seasonal']

/** Languages that match where people actually live — this drives the dialect-gap flag. */
const LANGUAGE_BY_DISTRICT: Record<string, string> = {
  Gumla: 'Kurukh',
  Lohardaga: 'Kurukh',
  Simdega: 'Kurukh',
  Pakur: 'Santali',
  Dhanbad: 'Santali',
  'Saraikela-Kharsawan': 'Ho',
  'West Singhbhum': 'Ho',
  Koderma: 'Magahi',
  Deoghar: 'Magahi',
}

const LOW_ACCURACY_LANGUAGES = new Set(['Kurukh', 'Santali', 'Ho', 'Magahi'])

const INTERESTS_BY_COURSE: Record<string, string[]> = {
  'Tailoring L1': ['Tailoring', 'Embroidery'],
  'Tailoring L2': ['Tailoring', 'Boutique work'],
  'Welding L1': ['Welding', 'Workshop work'],
  'Welding L2': ['Welding', 'Fabrication'],
  'Electrical wiring': ['Wiring', 'House repairs'],
  'Driving (LMV)': ['Driving', 'Transport work'],
  'Mobile repair': ['Mobile repair', 'Electronics'],
  'Masonry': ['Masonry', 'Construction'],
  'Food processing': ['Pickle making', 'Packaging'],
  'Beauty & wellness': ['Beauty work', 'Salon work'],
}

/**
 * The centre one resource person runs (S. Devi, Ghaghra). Seeded here rather than in
 * resourcePerson.ts so the trainer view, the Admin list and the gap map describe the
 * same people. Statuses are spread across the stages a trainer moves a trainee through.
 */
export const TRAINER_CENTRE = { district: 'Gumla', block: 'Ghaghra', centre: 'Ghaghra Training Centre' }

const TRAINER_INTAKE: { course: string; status: SeedStage }[] = [
  { course: 'Tailoring L1', status: 'enrolled' },
  { course: 'Tailoring L1', status: 'enrolled' },
  { course: 'Tailoring L1', status: 'attending' },
  { course: 'Tailoring L1', status: 'attending' },
  { course: 'Tailoring L1', status: 'attending' },
  { course: 'Tailoring L1', status: 'irregular' },
  { course: 'Tailoring L1', status: 'certified' },
  { course: 'Tailoring L1', status: 'certified' },
  { course: 'Tailoring L1', status: 'dropped' },
  { course: 'Tailoring L2', status: 'attending' },
  { course: 'Tailoring L2', status: 'irregular' },
  { course: 'Tailoring L2', status: 'certified' },
  { course: 'Tailoring L2', status: 'placed' },
  { course: 'Tailoring L2', status: 'trained-unplaced' },
]

/** Blocks that already have a working centre — the healthy cases, for contrast. */
const SERVED_BLOCKS = [
  { district: 'Ranchi', block: 'Bundu', course: 'Beauty & wellness', centre: 'Bundu Skill Hub' },
  { district: 'Ramgarh', block: 'Patratu', course: 'Welding L1', centre: 'Patratu ITI Annexe' },
  { district: 'Gumla', block: 'Sisai', course: 'Tailoring L1', centre: 'Sisai SHG Centre' },
  { district: 'Chatra', block: 'Simaria', course: 'Mobile repair', centre: 'Simaria Trade Centre' },
  { district: 'Hazaribagh', block: 'Barkagaon', course: 'Food processing', centre: "Barkagaon Women's Centre" },
  { district: 'East Singhbhum', block: 'Ghatshila', course: 'Electrical wiring', centre: 'Ghatshila Works Centre' },
  { district: 'Ranchi', block: 'Ratu', course: 'Tailoring L1', centre: 'Ratu SHG Centre' },
  { district: 'Dhanbad', block: 'Baliapur', course: 'Welding L1', centre: 'Baliapur ITI Annexe' },
  { district: 'Giridih', block: 'Bengabad', course: 'Masonry', centre: 'Bengabad Works Centre' },
]

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

function phoneNumber(rand: () => number, serial: number): string {
  const prefix = pick(rand, ['94310', '90062', '93348', '94711', '90023', '93041', '90068'])
  return `+91 ${prefix} ${String(10000 + (serial % 9000)).padStart(5, '0')}`
}

function sessionsFor(rand: () => number, status: SeedStage, total: number): SessionMark[] {
  const held =
    status === 'enrolled'
      ? Math.max(2, Math.round(total * 0.15))
      : status === 'attending'
        ? Math.round(total * 0.8)
        : status === 'irregular'
          ? Math.round(total * 0.75)
          : status === 'dropped'
            ? Math.round(total * 0.35)
            : total

  return Array.from({ length: held }, (_, index) => {
    const progress = index / Math.max(1, held - 1)
    if (status === 'irregular') return progress > 0.6 && rand() < 0.75 ? 'absent' : 'present'
    if (status === 'dropped') return progress > 0.4 ? 'absent' : rand() < 0.2 ? 'absent' : 'present'
    if (status === 'attending' || status === 'enrolled') return rand() < 0.1 ? 'absent' : 'present'
    return rand() < 0.06 ? 'absent' : 'present'
  })
}

function callsFor(
  rand: () => number,
  status: SeedStage,
  course: string,
  lastContactDays: number,
  hasDialectGap: boolean,
): CallRecord[] {
  const calls: CallRecord[] = [
    {
      when: dateLabel(lastContactDays + 150),
      handledBy: 'ai',
      summary: `First call. Profiled background and interests; ${course} matched on stated interest and travel limit.`,
      outcome: 'Recommendation made',
    },
  ]

  if (hasDialectGap) {
    calls.push({
      when: dateLabel(lastContactDays + 128),
      handledBy: 'executive',
      summary: 'Voice model could not follow the caller’s dialect after three attempts; an executive took over.',
      outcome: 'Dialect sample logged',
    })
  }

  if (status !== 'new' && status !== 'recommended') {
    calls.push({
      when: dateLabel(lastContactDays + 96),
      handledBy: 'ai',
      summary: 'Follow-up: did you enroll? Caller confirmed enrolment and batch timing.',
      outcome: 'Enrolment confirmed',
    })
  }

  if (status === 'irregular' || status === 'dropped') {
    calls.push({
      when: dateLabel(lastContactDays + 30),
      handledBy: 'ai',
      summary: 'Attendance follow-up after consecutive absences. Caller cited travel cost and distance.',
      outcome: status === 'dropped' ? 'Escalated to executive' : 'Problem detected',
    })
    calls.push({
      when: dateLabel(lastContactDays),
      handledBy: 'executive',
      summary:
        status === 'dropped'
          ? 'Caller confirmed they have stopped attending. Reason recorded for re-profiling.'
          : 'Discussed a nearer batch and morning timings to keep the caller attending.',
      outcome: status === 'dropped' ? 'Dropped, re-profiling offered' : 'Seat moved to nearer batch',
    })
  }

  if (status === 'trained-unplaced') {
    calls.push({
      when: dateLabel(lastContactDays + 20),
      handledBy: 'ai',
      summary: 'Placement follow-up after certification. Caller reported no employer within reach.',
      outcome: 'Problem detected',
    })
    calls.push({
      when: dateLabel(lastContactDays),
      handledBy: 'resourcePerson',
      summary: 'Expert call on placement options: nearby blocks, self-employment tooling and scheme-linked demand.',
      outcome: 'Escalated as trained-but-unplaced',
    })
  }

  if (status === 'placed') {
    calls.push({
      when: dateLabel(lastContactDays),
      handledBy: 'ai',
      summary: 'Placement follow-up. Caller confirmed steady work and regular income.',
      outcome: 'Placement confirmed',
    })
  }

  if (status === 'certified') {
    calls.push({
      when: dateLabel(lastContactDays),
      handledBy: 'ai',
      summary: 'Completion follow-up. Certificate delivery confirmed by SMS and WhatsApp.',
      outcome: 'Completion recorded',
    })
  }

  // A small, stable amount of variation in how chatty a record looks.
  if (rand() < 0.35) {
    calls.push({
      when: dateLabel(Math.max(1, lastContactDays - 3)),
      handledBy: 'ai',
      summary: 'Routine check-in. No problem reported.',
      outcome: 'No action needed',
    })
  }

  return calls
}

/** The stage is passed in rather than read off the record: the journey narrative follows
 *  the single combined thread the seeds were generated from. */
function journeyFor(person: Omit<Beneficiary, 'journey'>, status: SeedStage): JourneyEvent[] {
  const { course, centre, lastContactDays, attendance, aiFlags } = person
  const events: JourneyEvent[] = [
    {
      title: `First call · language ${person.preferredLanguage}`,
      detail: `Profiled by voice. Asked for work near ${person.village}; travel limit and interests recorded.`,
      when: dateLabel(lastContactDays + 150),
      tone: 'normal',
    },
  ]

  if (status !== 'new') {
    events.push({
      title: `Recommended · ${course}`,
      detail: centre ? `Matched on interest and distance; allotted to ${centre}.` : 'Matched on interest, but no centre in the block yet.',
      when: dateLabel(lastContactDays + 142),
      tone: 'normal',
    })
  }

  if (status === 'recommended') {
    events.push({
      title: 'Waiting for a seat',
      detail: 'No centre in this block. Caller is queued and told the expected wait by SMS.',
      when: dateLabel(lastContactDays + 120),
      tone: 'alert',
    })
  }

  if (centre && status !== 'new' && status !== 'recommended') {
    events.push({
      title: `Enrolled · ${centre}`,
      detail: `Confirmed by SMS in ${person.preferredLanguage}. Batch timing accepted.`,
      when: dateLabel(lastContactDays + 128),
      tone: 'normal',
    })
  }

  if (attendance) {
    events.push({
      title: `Attendance · ${attendance.attended} of ${attendance.total} sessions`,
      detail: `${Math.round((attendance.attended / attendance.total) * 100)}% of sessions held so far.`,
      when: `${dateLabel(lastContactDays + 120)} – ${dateLabel(Math.max(2, lastContactDays))}`,
      tone: 'normal',
      sessions: attendance.sessions,
    })
  }

  for (const flag of aiFlags) {
    events.push({
      title: `AI flag · ${flag}`,
      detail: 'Raised automatically from follow-up calls and attendance.',
      when: dateLabel(Math.max(3, lastContactDays + 6)),
      tone: 'alert',
    })
  }

  if (status === 'certified' || status === 'placed' || status === 'trained-unplaced') {
    events.push({
      title: 'Completed the course',
      detail: 'All modules finished; certificate generated automatically and sent by SMS and WhatsApp.',
      when: dateLabel(lastContactDays + 24),
      tone: 'normal',
    })
  }

  if (status === 'placed') {
    events.push({
      title: 'Placed',
      detail: 'Confirmed working with regular income on the last follow-up call.',
      when: dateLabel(lastContactDays),
      tone: 'normal',
    })
  } else if (status === 'trained-unplaced') {
    events.push({
      title: 'Trained, not placed',
      detail: 'No employer within reach. Escalated to a resource person for placement support.',
      when: dateLabel(lastContactDays),
      tone: 'alert',
    })
  } else if (status === 'dropped') {
    events.push({
      title: 'Dropped out',
      detail: 'Stopped attending. Reason recorded on the executive call for re-profiling.',
      when: dateLabel(lastContactDays),
      tone: 'alert',
    })
  } else {
    events.push({
      title: 'Outcome · pending',
      detail:
        status === 'new' || status === 'recommended'
          ? 'Not yet enrolled.'
          : `${(attendance?.total ?? 24) - (attendance?.attended ?? 0)} sessions to certification.`,
      when: 'Awaiting',
      tone: 'pending',
    })
  }

  return events
}

interface Draft {
  status: SeedStage
  district: string
  block: string
  course: string
  centre: string | null
  aiFlags: string[]
  lastContactDays: number
}

function draftsFromGap(gap: BlockGap, rand: () => number): Draft[] {
  if (gap.gapType === 'no-centre') {
    return [
      {
        status: 'recommended',
        district: gap.district,
        block: gap.block,
        course: gap.course,
        centre: null,
        aiFlags: gap.nearestCentreKm && gap.nearestCentreKm > 30 ? ['centre too far'] : [],
        lastContactDays: 4 + Math.floor(rand() * 20),
      },
      {
        status: rand() < 0.45 ? 'dropped' : 'new',
        district: gap.district,
        block: gap.block,
        course: gap.course,
        centre: null,
        aiFlags: rand() < 0.5 ? ['not responding'] : [],
        lastContactDays: 12 + Math.floor(rand() * 60),
      },
    ]
  }

  const centre = `${gap.block} Training Centre`
  return [
    {
      status: 'trained-unplaced',
      district: gap.district,
      block: gap.block,
      course: gap.course,
      centre,
      aiFlags: ['trained, no local jobs'],
      lastContactDays: 6 + Math.floor(rand() * 25),
    },
    {
      status: rand() < 0.5 ? 'placed' : 'certified',
      district: gap.district,
      block: gap.block,
      course: gap.course,
      centre,
      aiFlags: [],
      lastContactDays: 8 + Math.floor(rand() * 40),
    },
  ]
}

function build(): Beneficiary[] {
  const rand = mulberry32(20_260_916)
  const drafts: Draft[] = []

  for (const gap of loadBlockGaps()) drafts.push(...draftsFromGap(gap, rand))

  // Two learners per healthy block, so the middle of the funnel — enrolled, attending,
  // irregular, completed — is populated rather than only the flagged extremes.
  const servedPairs: [SeedStage, SeedStage][] = [
    ['attending', 'enrolled'],
    ['attending', 'irregular'],
    ['certified', 'attending'],
    ['enrolled', 'attending'],
    ['irregular', 'certified'],
    ['placed', 'attending'],
    ['attending', 'certified'],
    ['enrolled', 'irregular'],
    ['attending', 'placed'],
  ]

  for (const intake of TRAINER_INTAKE) {
    drafts.push({
      status: intake.status,
      district: TRAINER_CENTRE.district,
      block: TRAINER_CENTRE.block,
      course: intake.course,
      centre: TRAINER_CENTRE.centre,
      aiFlags:
        intake.status === 'irregular'
          ? ['attendance falling']
          : intake.status === 'dropped'
            ? ['stopped attending']
            : intake.status === 'trained-unplaced'
              ? ['trained, no local jobs']
              : [],
      lastContactDays: 1 + Math.floor(rand() * 20),
    })
  }

  SERVED_BLOCKS.forEach((served, index) => {
    for (const status of servedPairs[index % servedPairs.length]!) {
      drafts.push({
        status,
        district: served.district,
        block: served.block,
        course: served.course,
        centre: served.centre,
        aiFlags: status === 'irregular' ? ['attendance falling'] : [],
        lastContactDays: 1 + Math.floor(rand() * 18),
      })
    }
  })

  return drafts.map((draft, index) => {
    const gender: 'F' | 'M' = rand() < 0.55 ? 'F' : 'M'
    const first = pick(rand, gender === 'F' ? FEMALE_FIRST : MALE_FIRST)
    const surname = gender === 'F' ? pick(rand, ['Devi', 'Kumari', ...SURNAMES]) : pick(rand, SURNAMES)
    const language = LANGUAGE_BY_DISTRICT[draft.district] ?? 'Hindi'
    const hasDialectGap = LOW_ACCURACY_LANGUAGES.has(language) && rand() < 0.5
    const total = 24
    const sessions = draft.centre ? sessionsFor(rand, draft.status, total) : []
    const attendance = draft.centre && sessions.length > 0
      ? { attended: sessions.filter((mark) => mark === 'present').length, total, sessions }
      : null

    const aiFlags = [...draft.aiFlags]
    if (draft.status === 'irregular' && !aiFlags.includes('attendance falling')) aiFlags.push('attendance falling')
    if (hasDialectGap) aiFlags.push('dialect not recognised')

    const isStalled =
      draft.status === 'dropped' ||
      (draft.status === 'recommended' && draft.lastContactDays > 20) ||
      draft.status === 'trained-unplaced' ||
      aiFlags.includes('not responding')

    const core: Omit<Beneficiary, 'journey'> = {
      beneficiaryId: `SETU-JH-1${String(4000 + index * 13).padStart(5, '0')}`,
      name: `${first} ${surname}`,
      age: 19 + Math.floor(rand() * 26),
      gender,
      primaryNumber: phoneNumber(rand, index * 7 + 11),
      secondaryNumber: rand() < 0.65 ? phoneNumber(rand, index * 13 + 5) : null,
      preferredLanguage: language,
      district: draft.district,
      block: draft.block,
      village: pick(rand, VILLAGES),
      educationLevel: pick(rand, EDUCATION),
      currentWork: pick(rand, WORK),
      interests: INTERESTS_BY_COURSE[draft.course] ?? ['Skill training'],
      course: draft.course,
      centre: draft.centre,
      ...splitStage(draft.status),
      lastContactDays: draft.lastContactDays,
      aiFlags,
      isStalled,
      hasDialectGap,
      attendance,
      calls: callsFor(rand, draft.status, draft.course, draft.lastContactDays, hasDialectGap),
      outcome:
        draft.status === 'placed'
          ? 'Working, income regular'
          : draft.status === 'trained-unplaced'
            ? 'Certified but unplaced — with a resource person'
            : draft.status === 'dropped'
              ? 'Dropped out, open to re-profiling'
              : draft.status === 'certified'
                ? 'Certified, placement follow-up due'
                : 'In progress',
    }

    return { ...core, journey: journeyFor(core, draft.status) }
  })
}

const BENEFICIARIES = build()

registerSample('beneficiaries', BENEFICIARIES)

/**
 * Every beneficiary. Served from Firestore once the collection has loaded, and from the
 * seeded sample until then — or for good, if the query fails.
 */
export function loadBeneficiaries(): Beneficiary[] {
  return readSlot<Beneficiary>('beneficiaries')
}

/** The seeded sample, for the Firestore seeding script and as the last-resort fallback. */
export function sampleBeneficiaries(): Beneficiary[] {
  return BENEFICIARIES
}

export function isFlaggedOrStalled(person: Beneficiary): boolean {
  return person.aiFlags.length > 0 || person.isStalled
}

export function districts(): string[] {
  return [...new Set(loadBeneficiaries().map((person) => person.district))].sort()
}

export function blocks(district: string): string[] {
  return [
    ...new Set(
      loadBeneficiaries()
        .filter((person) => district === 'all' || person.district === district)
        .map((person) => person.block),
    ),
  ].sort()
}

export function courses(): string[] {
  return [...new Set(loadBeneficiaries().map((person) => person.course))].sort()
}
