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
  type EmploymentStatus,
  type TrainingStatus,
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

/** Documents are labelled by type so a PDF reads as a PDF in the list. */
export type DocumentType = 'pdf' | 'doc' | 'ppt' | 'sheet' | 'other'

export const DOCUMENT_TYPES: DocumentType[] = ['pdf', 'doc', 'ppt', 'sheet', 'other']

export interface CourseMaterial {
  id: string
  title: string
  kind: 'link' | 'note' | 'document'
  /** URL for a link or document, or the text itself for a note. */
  body: string
  /** Document only. */
  documentType?: DocumentType
  fileName?: string
  /** Bytes, when known. */
  fileSize?: number
  /**
   * Where a document lives.
   *
   * 'link' is the real path: Drive, DigiLocker or any hosted URL, which survives a
   * reload and costs nothing. 'demo-upload' is a file the trainer attached in the
   * browser — Firebase Storage needs the Blaze plan and this project is on Spark, so
   * there is nowhere to put the bytes. Those are held in memory for the demo only, are
   * lost on reload, and are labelled as such wherever they appear.
   */
  source?: 'link' | 'demo-upload'
}

/** Guesses the document type from a file name or URL, so the trainer rarely has to pick. */
export function documentTypeFor(nameOrUrl: string): DocumentType {
  const lower = nameOrUrl.toLowerCase()
  if (lower.includes('.pdf')) return 'pdf'
  if (lower.includes('.doc') || lower.includes('document/d/')) return 'doc'
  if (lower.includes('.ppt') || lower.includes('presentation/d/')) return 'ppt'
  if (lower.includes('.xls') || lower.includes('.csv') || lower.includes('spreadsheets/d/')) return 'sheet'
  return 'other'
}

/** Human file size, or null when the size is unknown (a link to someone else's file). */
export function formatFileSize(bytes: number | undefined): string | null {
  if (bytes === undefined) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface Batch {
  batchId: string
  course: string
  centre: string
  block: string
  district: string
  schedule: SessionSchedule
  totalSessions: number
  /** ISO date the batch began — the "from" date printed on a certificate. */
  startDate: string
  materials: CourseMaterial[]
}

export interface ResourcePersonProfile {
  userId: string
  name: string
  /** Printed under the trainer's name on a certificate. */
  designation: string
  block: string
  district: string
  batches: Batch[]
}

/**
 * NSQF qualification each course maps to. A certificate that names a level without the
 * job role it belongs to is not much use to an employer, so both are carried.
 */
export const NSQF_QUALIFICATIONS: Record<string, { level: string; jobRole: string }> = {
  'Tailoring L1': { level: '3', jobRole: 'Self-Employed Tailor' },
  'Tailoring L2': { level: '4', jobRole: 'Fashion Design Assistant' },
  'Welding L1': { level: '3', jobRole: 'Gas Cutter Welder' },
  'Electrical wiring': { level: '3', jobRole: 'Domestic Electrician' },
  'Mobile repair': { level: '4', jobRole: 'Field Technician — Mobile Phone' },
  'Masonry': { level: '3', jobRole: 'Mason General' },
  'Food processing': { level: '3', jobRole: 'Food Processing Operator' },
  'Beauty & wellness': { level: '3', jobRole: 'Beauty Therapist' },
  'Driving (LMV)': { level: '3', jobRole: 'Commercial Vehicle Driver' },
}

export function qualificationFor(course: string): { level: string; jobRole: string } | null {
  return NSQF_QUALIFICATIONS[course] ?? null
}

export const RESOURCE_PERSON: ResourcePersonProfile = {
  userId: 'rp-devi',
  name: 'S. Devi',
  designation: 'Resource Person · Tailoring trades',
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
      startDate: '2026-03-19',
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
        {
          id: 'mat-l1-handbook',
          kind: 'document',
          title: 'Tailoring L1 handbook (Hindi)',
          body: 'https://drive.google.com/file/d/1setu-tailoring-l1-handbook/view',
          documentType: 'pdf',
          fileName: 'tailoring-l1-handbook-hi.pdf',
          fileSize: 2_411_724,
          source: 'link',
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
      startDate: '2026-06-02',
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
        {
          id: 'mat-l2-assessment',
          kind: 'document',
          title: 'Assessment pattern and marking',
          body: 'https://drive.google.com/file/d/1setu-tailoring-l2-assessment/view',
          documentType: 'ppt',
          fileName: 'tailoring-l2-assessment.pptx',
          fileSize: 5_882_112,
          source: 'link',
        },
      ],
    },
  ],
}

/** The centre this trainer runs — the filter that defines "their" trainees. */
const OWN_CENTRE = TRAINER_CENTRE.centre

export interface Trainee extends Beneficiary {
  batchId: string
  /** ISO dates for the certificate. completedOn is null until the course is finished. */
  startedOn: string
  completedOn: string | null
  /** Set once the trainer marks them Completed. */
  certificateId: string | null
  nextCourse: string | null
  jobRecommendation: string | null
  /** Every status change carries the description the trainer had to write. */
  statusHistory: { status: TrainingStatus; description: string; whenLabel: string }[]
}

/** Finishing the course is certification — there is no separate completed stage. */
function isFinished(person: Beneficiary): boolean {
  return person.trainingStatus === 'certified'
}

function nextCourseAfter(course: string): string {
  return course === 'Tailoring L1' ? 'Tailoring L2' : 'Beauty & wellness'
}

function startOf(course: string): string {
  return (
    RESOURCE_PERSON.batches.find((batch) => batch.course === course)?.startDate ??
    RESOURCE_PERSON.batches[0]!.startDate
  )
}

/**
 * Completion date: the batch start plus the weeks it takes to hold every session, nudged
 * a few days per trainee so a batch does not appear to have certified everyone at once.
 */
function completionOf(person: Beneficiary): string {
  const batch = RESOURCE_PERSON.batches.find((entry) => entry.course === person.course) ?? RESOURCE_PERSON.batches[0]!
  const perWeek = Math.max(1, batch.schedule.days.length)
  const weeks = Math.ceil(batch.totalSessions / perWeek)
  const drift = Number.parseInt(person.beneficiaryId.slice(-2), 10) % 9
  const date = new Date(`${batch.startDate}T00:00:00`)
  date.setDate(date.getDate() + weeks * 7 + drift)
  return date.toISOString().slice(0, 10)
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
      startedOn: startOf(person.course),
      completedOn: isFinished(person) ? completionOf(person) : null,
      // Completing the course is what issues the certificate, so everyone past that
      // point already has one.
      certificateId: isFinished(person) ? `SETU-CERT-${person.beneficiaryId.slice(-4)}` : null,
      nextCourse: isFinished(person) ? nextCourseAfter(person.course) : null,
      jobRecommendation: isFinished(person) ? 'Ghaghra SHG garment cluster · piece work' : null,
      statusHistory: historyFor(person),
    }))
}

/** Descriptions the trainer wrote at each stage — every status change carries one. */
const STAGE_NOTE: Partial<Record<TrainingStatus, string>> = {
  attending: 'Coming to every session and keeping up with the cutting practice.',
  irregular: 'Missed three sessions in a row. Says the timing clashes with field work.',
  certified: 'Finished every module and passed the assessment. Certificate issued.',
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
  const order: TrainingStatus[] = ['attending', 'irregular', 'certified']
  const reached = order
    .slice(0, Math.max(0, order.indexOf(person.trainingStatus) + 1))
    // Not everyone who finished was irregular on the way; only keep it if that is where they are.
    .filter((status) => status !== 'irregular' || person.trainingStatus === 'irregular')
  const path: TrainingStatus[] =
    person.trainingStatus === 'enrolled' ? [] : reached.length > 0 ? reached : ['attending', person.trainingStatus]
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

/**
 * The fixed stages a trainer moves a trainee through. Certified is the end of training:
 * finishing the course is what issues the certificate, so there is no separate
 * "completed" stage to forget to follow up on.
 */
export const TRAINEE_STAGES: TrainingStatus[] = ['enrolled', 'attending', 'irregular', 'certified', 'dropped']

/** Stages that require next-course and job recommendations before they can be saved. */
export const STAGES_NEEDING_RECOMMENDATIONS: TrainingStatus[] = ['certified']

/** What a trainer can set a certified trainee's employment status to. */
export const TRAINEE_EMPLOYMENT: EmploymentStatus[] = ['seeking', 'placed', 'unplaced']

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

/**
 * The dates of the first `count` sessions a batch holds, walking forward from its start
 * date across the days it meets. Sessions are not stored anywhere: the schedule and the
 * attendance already recorded per trainee are enough to reconstruct them, which is what
 * keeps the Sessions section and the Beneficiaries section from ever disagreeing.
 */
export function sessionDates(batch: Batch, count: number): string[] {
  const dates: string[] = []
  if (batch.schedule.days.length === 0) return dates
  const cursor = new Date(`${batch.startDate}T00:00:00`)
  for (let day = 0; day < 400 && dates.length < count; day += 1) {
    if (batch.schedule.days.includes(cursor.getDay())) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

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
