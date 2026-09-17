/**
 * The signed-in resource person: their batches, schedule, materials and trainees.
 *
 * Trainees are the beneficiaries already seeded in jharkhandBeneficiaries who are taking
 * this person's courses, so the trainer view, the Admin beneficiary list and the gap map
 * all describe the same people.
 *
 * In production this comes from users/{uid}.assignedCentres + a beneficiaries query on
 * assignedResourcePerson (SETU-SPEC.md 8.1, 8.5, 8.7).
 */

import {
  loadBeneficiaries,
  TRAINER_CENTRE,
  type Beneficiary,
  type BeneficiaryStatus,
} from './jharkhandBeneficiaries'

export interface SessionSchedule {
  /** 0 = Sunday. Days the batch meets. */
  days: number[]
  startTime: string
  endTime: string
  mode: 'in-person' | 'online' | 'hybrid'
  location: string
  onlineLink: string | null
}

export interface CourseMaterial {
  id: string
  title: string
  kind: 'link' | 'note'
  /** URL for a link, or the text itself for a note. */
  body: string
}

export interface Batch {
  batchId: string
  course: string
  centre: string
  block: string
  district: string
  schedule: SessionSchedule
  totalSessions: number
  materials: CourseMaterial[]
}

export interface ResourcePersonProfile {
  userId: string
  name: string
  block: string
  district: string
  batches: Batch[]
}

export const RESOURCE_PERSON: ResourcePersonProfile = {
  userId: 'rp-devi',
  name: 'S. Devi',
  block: 'Ghaghra',
  district: 'Gumla',
  batches: [
    {
      batchId: 'GH-L1',
      course: 'Tailoring L1',
      centre: 'Ghaghra Training Centre',
      block: 'Ghaghra',
      district: 'Gumla',
      totalSessions: 24,
      schedule: {
        days: [1, 3, 5],
        startTime: '10:00',
        endTime: '12:00',
        mode: 'in-person',
        location: 'Ghaghra Training Centre, near the block office, Ghaghra',
        onlineLink: null,
      },
      materials: [
        {
          id: 'mat-l1-cutting',
          kind: 'note',
          title: 'Cutting basics',
          body: 'Measure, mark and cut for a straight kurta. Practise on old cloth before cutting new material.',
        },
        {
          id: 'mat-l1-machine',
          kind: 'note',
          title: 'Machine care',
          body: 'Oil the machine weekly. Check the bobbin before every session. Report any needle breakage the same day.',
        },
        {
          id: 'mat-l1-nsqf',
          kind: 'link',
          title: 'NSQF Level 3 — Self-Employed Tailor: qualification pack',
          body: 'https://www.nsdcindia.org/',
        },
      ],
    },
    {
      batchId: 'GH-L2',
      course: 'Tailoring L2',
      centre: 'Ghaghra Training Centre',
      block: 'Ghaghra',
      district: 'Gumla',
      totalSessions: 24,
      schedule: {
        days: [2, 4],
        startTime: '14:00',
        endTime: '16:00',
        mode: 'hybrid',
        location: 'Ghaghra Training Centre, near the block office, Ghaghra',
        onlineLink: 'https://meet.example.gov.in/setu-ghaghra-l2',
      },
      materials: [
        {
          id: 'mat-l2-blouse',
          kind: 'note',
          title: 'Blouse and salwar modules',
          body: 'Fitting, darts and finishing. Each trainee completes one full set before the assessment.',
        },
        {
          id: 'mat-l2-pricing',
          kind: 'note',
          title: 'Pricing piece work',
          body: 'Cost of cloth, thread and time. What to charge the SHG cluster per piece so the work is worth taking.',
        },
      ],
    },
  ],
}

/** The centre this trainer runs — the filter that defines "their" trainees. */
const OWN_CENTRE = TRAINER_CENTRE.centre

export interface Trainee extends Beneficiary {
  batchId: string
  /** Set once the trainer marks them Completed. */
  certificateId: string | null
  nextCourse: string | null
  jobRecommendation: string | null
  /** Every status change carries the description the trainer had to write. */
  statusHistory: { status: BeneficiaryStatus; description: string; whenLabel: string }[]
}

/** Statuses that mean the trainee finished the course. */
const FINISHED = new Set<BeneficiaryStatus>(['completed', 'certified', 'placed', 'trained-unplaced'])

function nextCourseAfter(course: string): string {
  return course === 'Tailoring L1' ? 'Tailoring L2' : 'Beauty & wellness'
}

function batchFor(course: string): string {
  return RESOURCE_PERSON.batches.find((batch) => batch.course === course)?.batchId ?? RESOURCE_PERSON.batches[0]!.batchId
}

export function loadTrainees(): Trainee[] {
  return loadBeneficiaries()
    .filter((person) => person.centre === OWN_CENTRE)
    .map((person) => ({
      ...person,
      batchId: batchFor(person.course),
      // Completing the course is what issues the certificate, so everyone past that
      // point already has one.
      certificateId: FINISHED.has(person.status) ? `SETU-CERT-${person.beneficiaryId.slice(-4)}` : null,
      nextCourse: FINISHED.has(person.status) ? nextCourseAfter(person.course) : null,
      jobRecommendation: FINISHED.has(person.status) ? 'Ghaghra SHG garment cluster · piece work' : null,
      statusHistory: historyFor(person),
    }))
}

/** Descriptions the trainer wrote at each stage — every status change carries one. */
const STAGE_NOTE: Partial<Record<BeneficiaryStatus, string>> = {
  attending: 'Coming to every session and keeping up with the cutting practice.',
  irregular: 'Missed three sessions in a row. Says the timing clashes with field work.',
  completed: 'Finished all modules and the practice set. Ready for assessment.',
  certified: 'Passed the assessment. Certificate issued and read out over the phone.',
  placed: 'Taking piece work from the SHG cluster and earning from it.',
  'trained-unplaced': 'Course finished, but no employer within reach yet. Waiting on the placement drive.',
  dropped: 'Stopped coming after the family asked her to take up daily-wage work instead.',
}

/** The path a trainee took to their current status, so a record is not a single line. */
function historyFor(person: Beneficiary): Trainee['statusHistory'] {
  const history: Trainee['statusHistory'] = [
    {
      status: 'enrolled',
      description: 'Seat allotted after the recommendation call; batch timing confirmed by SMS.',
      whenLabel: '19 Mar',
    },
  ]
  const order: BeneficiaryStatus[] = ['attending', 'irregular', 'completed', 'certified', 'placed']
  const reached = order
    .slice(0, Math.max(0, order.indexOf(person.status) + 1))
    // Not everyone who finished was irregular on the way; only keep it if that is where they are.
    .filter((status) => status !== 'irregular' || person.status === 'irregular')
  const path: BeneficiaryStatus[] =
    person.status === 'enrolled' ? [] : reached.length > 0 ? reached : ['attending', person.status]
  const months = ['12 Apr', '7 May', '3 Jun', '21 Jun', '9 Jul']

  path.forEach((status, index) => {
    history.push({
      status,
      description: STAGE_NOTE[status] ?? 'Status updated by the trainer.',
      whenLabel: months[index] ?? '9 Jul',
    })
  })
  return history
}

/** The fixed stages a trainer moves a trainee through. */
export const TRAINEE_STAGES: BeneficiaryStatus[] = [
  'enrolled',
  'attending',
  'irregular',
  'completed',
  'certified',
  'dropped',
]

/** Stages that require next-course and job recommendations before they can be saved. */
export const STAGES_NEEDING_RECOMMENDATIONS: BeneficiaryStatus[] = ['completed']

export const FLAG_REASONS = [
  'repeated-absence',
  'travel-cost',
  'family-pressure',
  'no-local-work',
  'needs-field-visit',
] as const

export type FlagReason = (typeof FLAG_REASONS)[number]

export const NEXT_COURSE_OPTIONS = ['Tailoring L2', 'Food processing', 'Beauty & wellness', 'Mobile repair']

export const JOB_OPTIONS = [
  'Ghaghra SHG garment cluster · piece work',
  'Gumla boutique · assistant tailor',
  'Self-employment · home stitching with a sewing-machine grant',
]

/** A session window for a given day, derived from the batch schedule. */
export interface SessionWindow {
  batchId: string
  course: string
  dayIndex: number
  startTime: string
  endTime: string
  mode: SessionSchedule['mode']
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/**
 * The session whose attendance sheet is open right now, if any.
 * Attendance is not something a trainer opens at will: the schedule decides.
 */
export function openSessionAt(now: Date, batches: Batch[] = RESOURCE_PERSON.batches): SessionWindow | null {
  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const batch of batches) {
    if (!batch.schedule.days.includes(day)) continue
    if (minutes < minutesOf(batch.schedule.startTime) || minutes > minutesOf(batch.schedule.endTime)) continue
    return {
      batchId: batch.batchId,
      course: batch.course,
      dayIndex: day,
      startTime: batch.schedule.startTime,
      endTime: batch.schedule.endTime,
      mode: batch.schedule.mode,
    }
  }
  return null
}

/** The next session to be held, for the "opens at" message when nothing is open. */
export function nextSessionAfter(
  now: Date,
  batches: Batch[] = RESOURCE_PERSON.batches,
): { window: SessionWindow; daysAhead: number } | null {
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const day = (now.getDay() + ahead) % 7
    for (const batch of batches) {
      if (!batch.schedule.days.includes(day)) continue
      const startsLater = ahead > 0 || now.getHours() * 60 + now.getMinutes() < minutesOf(batch.schedule.startTime)
      if (!startsLater) continue
      return {
        window: {
          batchId: batch.batchId,
          course: batch.course,
          dayIndex: day,
          startTime: batch.schedule.startTime,
          endTime: batch.schedule.endTime,
          mode: batch.schedule.mode,
        },
        daysAhead: ahead,
      }
    }
  }
  return null
}
