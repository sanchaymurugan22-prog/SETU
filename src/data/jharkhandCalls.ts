/**
 * Sample calls for the Call Console.
 *
 * Queue entries and completed reports are derived from the beneficiaries already seeded
 * in jharkhandBeneficiaries.ts, so a Kurukh-speaking caller from Gumla really is a Kurukh
 * speaker from Gumla, and the course they ask about is the one they were recommended.
 *
 * In production these are the `calls` documents (SETU-SPEC.md 8.2): the queue is
 * status 'waiting', the identity-bearing parts live in calls/{id}/private/detail, and
 * loadQueue() / loadCompleted() are the seams for those queries.
 */

import { loadBeneficiaries, type Beneficiary } from './jharkhandBeneficiaries'
import { detected } from './languageDetections'
import { liveCompleted, liveDetections, liveQueued } from './liveCalls'
import type { LanguageDetection } from '../lib/languageDetection'

export type ReasonTag =
  | 'ai-low-confidence'
  | 'beneficiary-requested-human'
  | 'course-question'
  | 'placement'
  | 'self-employment'
  | 'followup-unable-to-manage'

export const REASON_TAGS: ReasonTag[] = [
  'ai-low-confidence',
  'beneficiary-requested-human',
  'course-question',
  'placement',
  'self-employment',
  'followup-unable-to-manage',
]

export type TransferReason = 'course-question' | 'person-specific' | 'dissatisfaction'

/** Resource-person cases are split in two, as the spec requires. */
export type CallSubType = 'course-related' | 'common-related'

export const CALL_SUB_TYPES: CallSubType[] = ['course-related', 'common-related']

export const TRANSFER_REASONS: TransferReason[] = ['course-question', 'person-specific', 'dissatisfaction']

export type OutcomeKey =
  | 'resolved-on-call'
  | 'question-answered'
  | 'enrolled'
  | 're-enrolled'
  | 'transferred-nearer-centre'
  | 'transferred-resource-person'
  | 'escalated-no-jobs'
  | 'followup-closed'

export const OUTCOME_KEYS: OutcomeKey[] = [
  'resolved-on-call',
  'question-answered',
  'enrolled',
  're-enrolled',
  'transferred-nearer-centre',
  'transferred-resource-person',
  'escalated-no-jobs',
  'followup-closed',
]

export interface TranscriptLine {
  speaker: 'setu' | 'caller'
  text: string
  /** Script the line is written in, for the lang attribute. */
  lang: string
}

/** What the AI captured before the call was escalated — shown during the active call. */
export interface AiContext {
  callNumber: number
  whenLabel: string
  summary: string
  recommendedCourse: string
  recommendedCentre: string | null
  matchNote: string
  confidence: number
  transcript: TranscriptLine[]
  priorFlags: string[]
}

export interface QueuedCall {
  callId: string
  beneficiaryId: string
  /** Non-identity context shown in the queue: never a name, number or village. */
  district: string
  block: string
  /** What the detector heard after the bilingual greeting — not an official's choice. */
  detection: LanguageDetection
  reasonTag: ReasonTag
  reasonDetail: string
  /**
   * The caller's first utterance after the bilingual greeting, once a telephony layer
   * records it. Undefined in the seeded demo, which is what makes detection fall back to
   * the stored record instead of calling Bhashini.
   */
  audioSample?: Blob
  /** Set only on resource-person cases, which arrive by transfer from the Call Console. */
  subType?: CallSubType
  /** Who sent the case over, shown so the expert knows where it came from. */
  transferredFrom?: string
  /** Seconds waited when the console loaded; the queue ticks up from here. */
  waitedSeconds: number
  ai: AiContext
  /** Draft report content the executive reviews after the call. */
  draftDiscussion: string
  draftActions: string[]
  draftOutcome: OutcomeKey
  draftCourse: string
}

export interface CompletedCall {
  callId: string
  ref: string
  subType?: CallSubType
  detection: LanguageDetection
  whenLabel: string
  daysAgo: number
  durationSeconds: number
  discussion: string
  course: string
  actions: string[]
  outcome: OutcomeKey
}

export interface ResourcePersonOption {
  userId: string
  name: string
  block: string
  course: string
}

/** Resource persons an executive can hand a callback case to. */
export const RESOURCE_PERSONS: ResourcePersonOption[] = [
  { userId: 'rp-devi', name: 'S. Devi', block: 'Ghaghra', course: 'Tailoring L1' },
  { userId: 'rp-ansari', name: 'M. Ansari', block: 'Angara', course: 'Welding L2' },
  { userId: 'rp-prasad', name: 'R. Prasad', block: 'Hussainabad', course: 'Electrical wiring' },
  { userId: 'rp-munda', name: 'B. Munda', block: 'Torpa', course: 'Driving (LMV)' },
]

const all = loadBeneficiaries()

/** First beneficiary matching the predicate, so queue entries always resolve to a real record. */
function pick(predicate: (person: Beneficiary) => boolean): Beneficiary {
  return all.find(predicate) ?? all[0]!
}

const kurukhCaller = pick((p) => p.preferredLanguage === 'Kurukh' && p.course.startsWith('Tailoring'))
const isTrainedUnplaced = (p: Beneficiary) => p.trainingStatus === 'certified' && p.employmentStatus === 'unplaced'

const unplacedWelder = pick((p) => isTrainedUnplaced(p) && p.course.startsWith('Welding'))
const drivingCaller = pick((p) => p.course === 'Driving (LMV)')
const unplacedTailor = pick((p) => isTrainedUnplaced(p) && p.course.startsWith('Tailoring'))
const santaliCaller = pick((p) => p.preferredLanguage === 'Santali')
const beautyCaller = pick((p) => p.course === 'Beauty & wellness')
const foodCaller = pick((p) => p.course === 'Food processing')
const wiringCaller = pick((p) => p.course === 'Electrical wiring')
const mobileCaller = pick((p) => p.course === 'Mobile repair')

const QUEUE: QueuedCall[] = [
  {
    callId: 'call-q-1',
    beneficiaryId: kurukhCaller.beneficiaryId,
    detection: detected(kurukhCaller.preferredLanguage, 1),
    district: kurukhCaller.district,
    block: kurukhCaller.block,
    reasonTag: 'ai-low-confidence',
    reasonDetail: 'Dialect not recognised after three attempts',
    waitedSeconds: 380,
    ai: {
      callNumber: 7,
      whenLabel: 'today, 09:58',
      summary:
        'Caller asked to speak to a person after the system failed to recognise her Kurukh twice. She reported missing three tailoring sessions because of travel cost.',
      recommendedCourse: kurukhCaller.course,
      recommendedCentre: kurukhCaller.centre,
      matchNote: 'Matched on stated interest; nearest centre 41 km',
      confidence: 0.58,
      transcript: [
        { speaker: 'setu', text: 'क्या आप सिलाई कक्षा जारी रखना चाहती हैं?', lang: 'hi' },
        { speaker: 'caller', text: '[unrecognised · Kurukh, 4 s]', lang: 'en' },
        { speaker: 'setu', text: 'मैं आपको एक अधिकारी से जोड़ रही हूँ।', lang: 'hi' },
      ],
      priorFlags: kurukhCaller.aiFlags,
    },
    draftDiscussion:
      'Caller could not continue tailoring classes because the centre is 41 km away and the bus fare is beyond her means. She confirmed she still wants to finish the course and can attend mornings only.',
    draftActions: ['Seat moved to the nearer block centre, morning batch', 'Travel-cost constraint added to her record'],
    draftOutcome: 'transferred-nearer-centre',
    draftCourse: kurukhCaller.course,
  },
  {
    callId: 'call-q-2',
    beneficiaryId: unplacedWelder.beneficiaryId,
    detection: detected(unplacedWelder.preferredLanguage, 2),
    district: unplacedWelder.district,
    block: unplacedWelder.block,
    reasonTag: 'beneficiary-requested-human',
    reasonDetail: 'Asked to speak to a person about work',
    waitedSeconds: 344,
    ai: {
      callNumber: 5,
      whenLabel: 'today, 10:04',
      summary:
        'Certified welder with no work since training. Asked whether any employer nearby is hiring, and whether another trade would pay sooner.',
      recommendedCourse: unplacedWelder.course,
      recommendedCentre: unplacedWelder.centre,
      matchNote: 'Completed the course; no employer within 60 km',
      confidence: 0.71,
      transcript: [
        { speaker: 'setu', text: 'क्या आपको काम मिला?', lang: 'hi' },
        { speaker: 'caller', text: 'नहीं, यहाँ कोई काम नहीं है। किसी से बात कराइए।', lang: 'hi' },
      ],
      priorFlags: unplacedWelder.aiFlags,
    },
    draftDiscussion:
      'Trained welder reports no employer within reach since certification. Wants either placement help or a second trade that pays sooner.',
    draftActions: ['Flagged as trained-but-unplaced', 'Block gap escalated to the district', 'Callback booked with a resource person'],
    draftOutcome: 'escalated-no-jobs',
    draftCourse: unplacedWelder.course,
  },
  {
    callId: 'call-q-3',
    beneficiaryId: drivingCaller.beneficiaryId,
    detection: detected(drivingCaller.preferredLanguage, 3),
    district: drivingCaller.district,
    block: drivingCaller.block,
    reasonTag: 'course-question',
    reasonDetail: 'Asked about licence test fees',
    waitedSeconds: 248,
    ai: {
      callNumber: 3,
      whenLabel: 'today, 10:11',
      summary: 'Caller asked what the driving licence test costs and whether SETU covers it.',
      recommendedCourse: drivingCaller.course,
      recommendedCentre: drivingCaller.centre,
      matchNote: 'Matched on interest and local transport demand',
      confidence: 0.69,
      transcript: [
        { speaker: 'caller', text: 'लाइसेंस टेस्ट का पैसा कौन देगा?', lang: 'hi' },
        { speaker: 'setu', text: 'मैं आपको सही जानकारी के लिए अधिकारी से जोड़ रही हूँ।', lang: 'hi' },
      ],
      priorFlags: drivingCaller.aiFlags,
    },
    draftDiscussion: 'Caller asked who pays the licence test fee. Explained that training is free and the test fee is reimbursed on passing.',
    draftActions: ['Fee and reimbursement rules explained', 'Reimbursement form noted for the centre'],
    draftOutcome: 'question-answered',
    draftCourse: drivingCaller.course,
  },
  {
    callId: 'call-q-4',
    beneficiaryId: unplacedTailor.beneficiaryId,
    detection: detected(unplacedTailor.preferredLanguage, 4),
    district: unplacedTailor.district,
    block: unplacedTailor.block,
    reasonTag: 'followup-unable-to-manage',
    reasonDetail: 'Third placement follow-up unanswered',
    waitedSeconds: 211,
    ai: {
      callNumber: 6,
      whenLabel: 'today, 10:15',
      summary: 'Three automated placement follow-ups went unanswered. The call was routed to a human for a manual attempt.',
      recommendedCourse: unplacedTailor.course,
      recommendedCentre: unplacedTailor.centre,
      matchNote: 'Certified; no local buyers recorded for the trade',
      confidence: 0.44,
      transcript: [{ speaker: 'setu', text: 'क्या आप अभी बात कर सकती हैं?', lang: 'hi' }],
      priorFlags: unplacedTailor.aiFlags,
    },
    draftDiscussion: 'Reached the caller after three unanswered follow-ups. She is stitching at home but has no steady buyer.',
    draftActions: ['Linked to the district SHG cluster', 'Placement drive date shared by SMS'],
    draftOutcome: 'followup-closed',
    draftCourse: unplacedTailor.course,
  },
  {
    callId: 'call-q-5',
    beneficiaryId: santaliCaller.beneficiaryId,
    detection: detected(santaliCaller.preferredLanguage, 5),
    district: santaliCaller.district,
    block: santaliCaller.block,
    reasonTag: 'ai-low-confidence',
    reasonDetail: 'Background noise, transcript incomplete',
    waitedSeconds: 177,
    ai: {
      callNumber: 2,
      whenLabel: 'today, 10:19',
      summary: 'Speech recognition confidence stayed low across the call; most of the caller’s replies were not transcribed.',
      recommendedCourse: santaliCaller.course,
      recommendedCentre: santaliCaller.centre,
      matchNote: 'Interest recorded, but confirmation could not be understood',
      confidence: 0.39,
      transcript: [
        { speaker: 'setu', text: 'आप कौन सा काम सीखना चाहती हैं?', lang: 'hi' },
        { speaker: 'caller', text: '[unrecognised · Santali, 6 s]', lang: 'en' },
      ],
      priorFlags: santaliCaller.aiFlags,
    },
    draftDiscussion: 'Confirmed the caller’s interest in tailoring by speaking in her own language. Her block has no centre yet.',
    draftActions: ['Interest confirmed and recorded', 'Santali sample logged for the voice model'],
    draftOutcome: 'resolved-on-call',
    draftCourse: santaliCaller.course,
  },
  {
    callId: 'call-q-6',
    beneficiaryId: beautyCaller.beneficiaryId,
    detection: detected(beautyCaller.preferredLanguage, 6),
    district: beautyCaller.district,
    block: beautyCaller.block,
    reasonTag: 'beneficiary-requested-human',
    reasonDetail: 'Wants to change course choice',
    waitedSeconds: 300,
    ai: {
      callNumber: 4,
      whenLabel: 'today, 10:23',
      summary: 'Caller asked to change from the recommended trade to something she can do from home.',
      recommendedCourse: beautyCaller.course,
      recommendedCentre: beautyCaller.centre,
      matchNote: 'Original match on stated interest; circumstances have changed',
      confidence: 0.66,
      transcript: [{ speaker: 'caller', text: 'मुझे घर से करने वाला काम चाहिए।', lang: 'hi' }],
      priorFlags: beautyCaller.aiFlags,
    },
    draftDiscussion: 'Caller wants home-based work after a change in childcare. Re-profiled and offered a home-based trade at the same centre.',
    draftActions: ['Course changed on her record', 'Previous seat released to the queue'],
    draftOutcome: 're-enrolled',
    draftCourse: beautyCaller.course,
  },
  {
    callId: 'call-q-7',
    beneficiaryId: foodCaller.beneficiaryId,
    detection: detected(foodCaller.preferredLanguage, 7),
    district: foodCaller.district,
    block: foodCaller.block,
    reasonTag: 'course-question',
    reasonDetail: 'Asked whether classes are free',
    waitedSeconds: 38,
    ai: {
      callNumber: 2,
      whenLabel: 'today, 10:27',
      summary: 'A neighbour told the caller a fee was payable. She asked SETU to confirm before enrolling.',
      recommendedCourse: foodCaller.course,
      recommendedCentre: foodCaller.centre,
      matchNote: 'Matched on interest; seats free at the women’s centre',
      confidence: 0.74,
      transcript: [{ speaker: 'caller', text: 'क्या क्लास के लिए पैसा लगेगा?', lang: 'hi' }],
      priorFlags: foodCaller.aiFlags,
    },
    draftDiscussion: 'Confirmed that the training is free of cost and that a certificate is issued on completion.',
    draftActions: ['Confirmed training is free', 'Enrolled in the next batch'],
    draftOutcome: 'enrolled',
    draftCourse: foodCaller.course,
  },
  {
    callId: 'call-q-8',
    beneficiaryId: wiringCaller.beneficiaryId,
    detection: detected(wiringCaller.preferredLanguage, 8),
    district: wiringCaller.district,
    block: wiringCaller.block,
    reasonTag: 'followup-unable-to-manage',
    reasonDetail: 'Enrolment follow-up, no answer twice',
    waitedSeconds: 26,
    ai: {
      callNumber: 3,
      whenLabel: 'today, 10:30',
      summary: 'Two automated enrolment follow-ups went unanswered after the recommendation.',
      recommendedCourse: wiringCaller.course,
      recommendedCentre: wiringCaller.centre,
      matchNote: 'Recommended, but no centre in the block yet',
      confidence: 0.52,
      transcript: [{ speaker: 'setu', text: 'क्या आपने नामांकन कराया?', lang: 'hi' }],
      priorFlags: wiringCaller.aiFlags,
    },
    draftDiscussion: 'Caller has not enrolled because no centre has opened in his block. Explained the queue and the expected wait.',
    draftActions: ['Queue position explained', 'Wait time sent by SMS'],
    draftOutcome: 'followup-closed',
    draftCourse: wiringCaller.course,
  },
  {
    callId: 'call-q-9',
    beneficiaryId: mobileCaller.beneficiaryId,
    detection: detected(mobileCaller.preferredLanguage, 9),
    district: mobileCaller.district,
    block: mobileCaller.block,
    reasonTag: 'ai-low-confidence',
    reasonDetail: 'Caller spoke over the prompt',
    waitedSeconds: 260,
    ai: {
      callNumber: 1,
      whenLabel: 'today, 10:32',
      summary: 'First call. The caller spoke over each prompt, so the profile could not be completed automatically.',
      recommendedCourse: mobileCaller.course,
      recommendedCentre: mobileCaller.centre,
      matchNote: 'Provisional match from the little that was captured',
      confidence: 0.41,
      transcript: [{ speaker: 'setu', text: 'नमस्ते, मैं SETU हूँ। आप क्या काम सीखना चाहते हैं?', lang: 'hi' }],
      priorFlags: mobileCaller.aiFlags,
    },
    draftDiscussion: 'Completed the profile by voice with the caller. He wants mobile repair and can travel up to 20 km.',
    draftActions: ['Profile completed and recorded', 'Recommendation confirmed'],
    draftOutcome: 'resolved-on-call',
    draftCourse: mobileCaller.course,
  },
]

const COMPLETED: CompletedCall[] = [
  {
    callId: 'call-c-1',
    ref: 'CR-7841',
    detection: detected('Kurukh', 10),
    whenLabel: '15 Sep · 09:58',
    daysAgo: 1,
    durationSeconds: 378,
    discussion:
      'Could not continue tailoring classes — the allotted centre is 41 km away and the bus fare is unaffordable. Still wants to finish; mornings only.',
    course: 'Tailoring L1 · nearer block centre',
    actions: ['Seat moved to the morning batch', 'Travel-cost constraint recorded', 'Resource person to confirm the batch'],
    outcome: 'transferred-nearer-centre',
  },
  {
    callId: 'call-c-2',
    ref: 'CR-7840',
    detection: detected('Hindi', 11),
    whenLabel: '15 Sep · 09:31',
    daysAgo: 1,
    durationSeconds: 182,
    discussion:
      'Asked whether the welding certificate is recognised outside the state, and whether any placement help follows the training.',
    course: 'Welding L2 · continued as allotted',
    actions: ['Certificate validity explained', 'Added to the placement-drive list'],
    outcome: 'question-answered',
  },
  {
    callId: 'call-c-3',
    ref: 'CR-7822',
    detection: detected('Hindi', 12),
    whenLabel: '14 Sep · 16:47',
    daysAgo: 2,
    durationSeconds: 521,
    discussion:
      'Trained welder with no work since certification. Reported no employer within reach and asked whether another trade could be taken up.',
    course: 'Retained welding · mobile repair added as a second option',
    actions: ['Flagged as trained-but-unplaced', 'Block gap escalated to the district', 'Callback booked'],
    outcome: 'escalated-no-jobs',
  },
  {
    callId: 'call-c-4',
    ref: 'CR-7815',
    detection: detected('Hindi', 13),
    whenLabel: '14 Sep · 14:12',
    daysAgo: 2,
    durationSeconds: 146,
    discussion: 'Wanted to change from driving to electrical wiring after the family’s vehicle plan fell through.',
    course: 'Electrical wiring · block centre, seats free',
    actions: ['Course changed on record', 'Driving queue place released'],
    outcome: 're-enrolled',
  },
  {
    callId: 'call-c-5',
    ref: 'CR-7788',
    detection: detected('Kurukh', 14),
    whenLabel: '13 Sep · 11:05',
    daysAgo: 3,
    durationSeconds: 294,
    discussion:
      'Dialect not recognised by the system on three attempts. Caller asked for course options near her block and for the class timing.',
    course: 'Food processing · women’s centre',
    actions: ['Enrolled in the afternoon batch', 'Kurukh sample logged for the voice model'],
    outcome: 'enrolled',
  },
  {
    callId: 'call-c-6',
    ref: 'CR-7754',
    detection: detected('Hindi', 15),
    whenLabel: '12 Sep · 15:38',
    daysAgo: 4,
    durationSeconds: 310,
    discussion:
      'Third attendance follow-up. Caller had stopped attending after a family illness and was unsure whether the seat was still held.',
    course: 'Tailoring L2 · same centre, restart',
    actions: ['Seat confirmed held for 30 days', 'Transferred to a resource person'],
    outcome: 'followup-closed',
  },
  {
    callId: 'call-c-7',
    ref: 'CR-7749',
    detection: detected('Magahi', 16),
    whenLabel: '12 Sep · 12:20',
    daysAgo: 4,
    durationSeconds: 227,
    discussion:
      'Asked whether classes cost anything and whether a certificate is issued at the end. Had been told by a neighbour that a fee was payable.',
    course: 'Mobile repair · block trade centre',
    actions: ['Confirmed training is free of cost', 'Enrolled in the next batch'],
    outcome: 'enrolled',
  },
  {
    callId: 'call-c-8',
    ref: 'CR-7741',
    detection: detected('Ho', 17),
    whenLabel: '12 Sep · 10:04',
    daysAgo: 4,
    durationSeconds: 362,
    discussion: 'Dissatisfied with the allotted batch timing, which clashed with daily wage work. Asked to be moved or removed from the list.',
    course: 'Masonry · evening batch, same centre',
    actions: ['Moved to the evening batch', 'Dissatisfaction noted for the centre', 'Transferred to a resource person'],
    outcome: 'transferred-resource-person',
  },
]

/** Swap for a Firestore query on calls where status == 'waiting' and callType == 'executive'. */
export function loadQueue(): QueuedCall[] {
  // A call the voice line escalated joins the queue ahead of the seeded ones.
  return [...liveQueued(), ...QUEUE]
}

/** Swap for a query on calls where handledBy == this executive and status == 'completed'. */
export function loadCompleted(): CompletedCall[] {
  return [...liveCompleted(), ...COMPLETED]
}

/** Beneficiaries created by the voice line this session, keyed by id. */
const liveBeneficiaries = new Map<string, Beneficiary>()

export function registerLiveBeneficiary(person: Beneficiary): void {
  liveBeneficiaries.set(person.beneficiaryId, person)
}

export function beneficiaryForCall(beneficiaryId: string): Beneficiary {
  return liveBeneficiaries.get(beneficiaryId) ?? all.find((person) => person.beneficiaryId === beneficiaryId) ?? all[0]!
}

/** mm:ss for the queue, the call timer and completed durations. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const RP_QUEUE: QueuedCall[] = [
  {
    callId: 'call-rp-1',
    beneficiaryId: unplacedWelder.beneficiaryId,
    district: unplacedWelder.district,
    block: unplacedWelder.block,
    detection: detected(unplacedWelder.preferredLanguage, 18),
    reasonTag: 'course-question',
    reasonDetail: 'Asked what a welding certificate is worth outside the state',
    subType: 'course-related',
    transferredFrom: 'A. Mahato',
    waitedSeconds: 214,
    ai: {
      callNumber: 6,
      whenLabel: 'today, 10:36',
      summary:
        'Transferred by the Call Console: the caller wants a trade expert, not general support. He asks which employers recognise the certificate and what the work pays.',
      recommendedCourse: unplacedWelder.course,
      recommendedCentre: unplacedWelder.centre,
      matchNote: 'Certified welder; no employer within 60 km',
      confidence: 0.79,
      transcript: [{ speaker: 'caller', text: 'यह सर्टिफिकेट कहाँ-कहाँ चलेगा?', lang: 'hi' }],
      priorFlags: unplacedWelder.aiFlags,
    },
    draftDiscussion:
      'Explained where the NSQF welding certificate is recognised, what fabricators in the district pay, and which employers hire at Level 2.',
    draftActions: ['Certificate recognition explained', 'Added to the Bokaro employer panel list'],
    draftOutcome: 'question-answered',
    draftCourse: unplacedWelder.course,
  },
  {
    callId: 'call-rp-2',
    beneficiaryId: kurukhCaller.beneficiaryId,
    district: kurukhCaller.district,
    block: kurukhCaller.block,
    detection: detected(kurukhCaller.preferredLanguage, 19),
    reasonTag: 'beneficiary-requested-human',
    reasonDetail: 'Dissatisfied with the batch after the transfer',
    subType: 'common-related',
    transferredFrom: 'A. Mahato',
    waitedSeconds: 142,
    ai: {
      callNumber: 8,
      whenLabel: 'today, 10:41',
      summary:
        'Transferred as a dissatisfaction case. The caller says the new batch timing still clashes with field work and she is considering stopping.',
      recommendedCourse: kurukhCaller.course,
      recommendedCentre: kurukhCaller.centre,
      matchNote: 'Attendance falling; travel cost already recorded',
      confidence: 0.61,
      transcript: [{ speaker: 'caller', text: 'सुबह का समय भी नहीं हो पाता।', lang: 'hi' }],
      priorFlags: kurukhCaller.aiFlags,
    },
    draftDiscussion:
      'Talked through what is making attendance hard. Agreed to move her to the afternoon batch and to count two missed sessions as made up through practice at home.',
    draftActions: ['Moved to the afternoon batch', 'Practice-at-home plan agreed'],
    draftOutcome: 'resolved-on-call',
    draftCourse: kurukhCaller.course,
  },
  {
    callId: 'call-rp-3',
    beneficiaryId: drivingCaller.beneficiaryId,
    district: drivingCaller.district,
    block: drivingCaller.block,
    detection: detected(drivingCaller.preferredLanguage, 20),
    reasonTag: 'course-question',
    reasonDetail: 'Wants to know if a different trade suits him better',
    subType: 'course-related',
    transferredFrom: 'A. Mahato',
    waitedSeconds: 47,
    ai: {
      callNumber: 4,
      whenLabel: 'today, 10:44',
      summary: 'Transferred for trade advice: the caller is unsure between driving and mobile repair.',
      recommendedCourse: drivingCaller.course,
      recommendedCentre: drivingCaller.centre,
      matchNote: 'Interested in both; transport demand is seasonal here',
      confidence: 0.72,
      transcript: [{ speaker: 'caller', text: 'कौन सा काम ज़्यादा चलेगा?', lang: 'hi' }],
      priorFlags: drivingCaller.aiFlags,
    },
    draftDiscussion:
      'Compared earnings and seasonality for driving against mobile repair in his block, and what each course demands in time and cost.',
    draftActions: ['Trade comparison explained', 'Caller will confirm his choice at the next follow-up'],
    draftOutcome: 'question-answered',
    draftCourse: drivingCaller.course,
  },
]

const RP_COMPLETED: CompletedCall[] = [
  {
    callId: 'call-rpc-1',
    ref: 'RP-2214',
    subType: 'course-related',
    detection: detected('Hindi', 21),
    whenLabel: '16 Sep · 15:20',
    daysAgo: 1,
    durationSeconds: 412,
    discussion:
      'Trainee asked what the assessment covers and whether a missed module can be made up before certification.',
    course: 'Tailoring L1 · assessment guidance',
    actions: ['Assessment modules explained', 'Make-up session offered on Friday'],
    outcome: 'question-answered',
  },
  {
    callId: 'call-rpc-2',
    ref: 'RP-2208',
    subType: 'common-related',
    detection: detected('Kurukh', 22),
    whenLabel: '15 Sep · 11:48',
    daysAgo: 2,
    durationSeconds: 566,
    discussion:
      'Repeated dropout risk. Family wanted her to stop after two absences; she wanted to continue but could not say so at home.',
    course: 'Tailoring L1 · retained',
    actions: ['Spoke with the trainee about options', 'Home visit requested through the admin flag'],
    outcome: 'followup-closed',
  },
  {
    callId: 'call-rpc-3',
    ref: 'RP-2201',
    subType: 'course-related',
    detection: detected('Hindi', 23),
    whenLabel: '14 Sep · 09:15',
    daysAgo: 3,
    durationSeconds: 245,
    discussion: 'Certified tailor asked which upskilling course to take next and whether it needs travel.',
    course: 'Tailoring L2 · recommended',
    actions: ['Next course explained', 'Seat held in the L2 batch'],
    outcome: 'enrolled',
  },
  {
    callId: 'call-rpc-4',
    ref: 'RP-2196',
    subType: 'common-related',
    detection: detected('Ho', 24),
    whenLabel: '13 Sep · 16:02',
    daysAgo: 4,
    durationSeconds: 388,
    discussion:
      'Trained but unplaced for four months. Wanted to know whether self-employment support exists instead of waiting for a job.',
    course: 'Self-employment track discussed',
    actions: ['Sewing-machine grant route explained', 'Escalated to the district for the placement drive'],
    outcome: 'escalated-no-jobs',
  },
]

/** Cases transferred to this resource person by the Call Console. */
export function loadResourcePersonQueue(): QueuedCall[] {
  return RP_QUEUE
}

/** This resource person's own completed expert calls. */
export function loadResourcePersonCompleted(): CompletedCall[] {
  return RP_COMPLETED
}

/** Detection records from every call this console knows about, for the dialect-gap figures. */
export function callDetections(): LanguageDetection[] {
  return [...liveDetections(), ...[...QUEUE, ...COMPLETED, ...RP_QUEUE, ...RP_COMPLETED].map((call) => call.detection)]
}

/** Calls waiting longer than this are shown as over target. */
export const WAIT_TARGET_SECONDS = 300
export const CONFIDENCE_THRESHOLD = 0.75
