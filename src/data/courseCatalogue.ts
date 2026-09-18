/**
 * What SETU knows about each course.
 *
 * PART 4 rule 1 of the conversation script: the assistant never invents a fee, an
 * earning figure or a course detail. Everything it can say about a course is in this
 * record. A question this record cannot answer is an escalation, not a guess — which is
 * why every field is optional-by-absence rather than filled with a plausible number.
 */

import { loadCentres } from './adminConsole'
import { loadBlockGaps } from './jharkhandGaps'

export interface CourseRecord {
  course: string
  nsqfLevel: number
  jobRole: string
  /** Minimum schooling in years. 0 means no schooling required. */
  minimumClass: number
  /** True when the course cannot be followed without reading. */
  needsLiteracy: boolean
  /** Can be practised from home once trained. */
  homeBased: boolean
  /** Needs a smartphone with internet to train or to work. */
  needsSmartphone: boolean
  durationWeeks: number
  whatYouLearn: string
  toolsUsed: string
  typicalWork: string
  /** Rupees per month, as recorded by the department. Absent when not on record. */
  earningRange: string | null
  feeNote: string
}

export const COURSE_RECORDS: CourseRecord[] = [
  {
    course: 'Tailoring L1',
    nsqfLevel: 3,
    jobRole: 'Self-Employed Tailor',
    minimumClass: 0,
    needsLiteracy: false,
    homeBased: true,
    needsSmartphone: false,
    durationWeeks: 8,
    whatYouLearn: 'measuring, cutting and stitching a kurta, blouse and salwar',
    toolsUsed: 'a sewing machine, scissors, measuring tape and chalk',
    typicalWork: 'stitching at home for the village, or piece work for an SHG cluster',
    earningRange: '₹4,000–7,000 a month from piece work',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Tailoring L2',
    nsqfLevel: 4,
    jobRole: 'Fashion Design Assistant',
    minimumClass: 8,
    needsLiteracy: true,
    homeBased: true,
    needsSmartphone: false,
    durationWeeks: 8,
    whatYouLearn: 'fitting, darts, finishing and pricing piece work',
    toolsUsed: 'a sewing machine, overlock machine and pattern paper',
    typicalWork: 'boutique work, or taking orders directly from a cluster',
    earningRange: '₹6,000–10,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Welding L1',
    nsqfLevel: 3,
    jobRole: 'Gas Cutter Welder',
    minimumClass: 5,
    needsLiteracy: false,
    homeBased: false,
    needsSmartphone: false,
    durationWeeks: 10,
    whatYouLearn: 'arc welding, gas cutting and reading a simple job drawing',
    toolsUsed: 'a welding set, cutting torch, grinder and safety gear',
    typicalWork: 'fabrication shops, construction sites and workshop repair',
    earningRange: '₹9,000–14,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Welding L2',
    nsqfLevel: 4,
    jobRole: 'Welder — Structural',
    minimumClass: 8,
    needsLiteracy: true,
    homeBased: false,
    needsSmartphone: false,
    durationWeeks: 12,
    whatYouLearn: 'structural welding, joint testing and site safety',
    toolsUsed: 'MIG and TIG sets, grinders and testing gauges',
    typicalWork: 'plant and structural contracts, often with an employer',
    earningRange: '₹12,000–18,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Electrical wiring',
    nsqfLevel: 3,
    jobRole: 'Domestic Electrician',
    minimumClass: 8,
    needsLiteracy: true,
    homeBased: false,
    needsSmartphone: false,
    durationWeeks: 10,
    whatYouLearn: 'house wiring, fittings, earthing and fault finding',
    toolsUsed: 'a tester, pliers, drill and multimeter',
    typicalWork: 'house wiring jobs, shop maintenance and contractor work',
    earningRange: '₹8,000–13,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Mobile repair',
    nsqfLevel: 4,
    jobRole: 'Field Technician — Mobile Phone',
    minimumClass: 8,
    needsLiteracy: true,
    homeBased: true,
    needsSmartphone: true,
    durationWeeks: 8,
    whatYouLearn: 'screen and battery replacement, software flashing and fault finding',
    toolsUsed: 'a soldering station, opening kit and multimeter',
    typicalWork: 'a repair counter in the market, or your own small shop',
    earningRange: '₹6,000–12,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Masonry',
    nsqfLevel: 3,
    jobRole: 'Mason General',
    minimumClass: 0,
    needsLiteracy: false,
    homeBased: false,
    needsSmartphone: false,
    durationWeeks: 8,
    whatYouLearn: 'brickwork, plastering, levelling and estimating material',
    toolsUsed: 'a trowel, plumb line, level and mortar tools',
    typicalWork: 'construction sites and house building in the block',
    earningRange: '₹9,000–15,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Food processing',
    nsqfLevel: 3,
    jobRole: 'Food Processing Operator',
    minimumClass: 0,
    needsLiteracy: false,
    homeBased: true,
    needsSmartphone: false,
    durationWeeks: 6,
    whatYouLearn: 'pickle and spice making, drying, packing and shelf life',
    toolsUsed: 'a sealing machine, weighing scale and storage jars',
    typicalWork: 'home production sold through an SHG or local shops',
    earningRange: '₹3,500–6,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Beauty & wellness',
    nsqfLevel: 3,
    jobRole: 'Beauty Therapist',
    minimumClass: 5,
    needsLiteracy: false,
    homeBased: true,
    needsSmartphone: false,
    durationWeeks: 8,
    whatYouLearn: 'threading, facials, hair care and basic salon hygiene',
    toolsUsed: 'a salon kit, steamer and sterilising equipment',
    typicalWork: 'home service for the village, or a chair in a local parlour',
    earningRange: '₹4,000–9,000 a month',
    feeNote: 'free under PM-AJAY',
  },
  {
    course: 'Driving (LMV)',
    nsqfLevel: 3,
    jobRole: 'Commercial Vehicle Driver',
    minimumClass: 5,
    needsLiteracy: true,
    homeBased: false,
    needsSmartphone: false,
    durationWeeks: 6,
    whatYouLearn: 'light vehicle driving, road rules and licence preparation',
    toolsUsed: 'a training vehicle and the RTO licence process',
    typicalWork: 'goods transport, school and office vehicles',
    earningRange: null,
    feeNote: 'free under PM-AJAY',
  },
]

export function courseRecord(course: string): CourseRecord | null {
  return COURSE_RECORDS.find((record) => record.course === course) ?? null
}

/* ─────────────────────────── The matching rules ─────────────────────────── */

export type Mobility = 'can-travel' | 'limited' | 'cannot-travel'

export interface MatchInput {
  block: string
  district: string
  /** Years of schooling. Null when unknown — treated as no barrier, per the script. */
  schoolYears: number | null
  literacy: 'low' | 'normal' | 'unknown'
  mobility: Mobility
  hasSmartphone: boolean
  interests: string[]
  familyTrade: string | null
  workPreference: 'job' | 'self-employment' | 'unsure'
}

export interface MatchResult {
  course: CourseRecord
  centreName: string
  centreBlock: string
  centreDistrict: string
  distanceKm: number
  seatsLeft: number
  /** Why this one, in the words the assistant will speak. */
  reasons: string[]
  localDemand: boolean
}

/** Rough distance: same block is close, same district a bus ride, otherwise far. */
function distanceFor(fromBlock: string, fromDistrict: string, centreBlock: string, centreDistrict: string): number {
  if (fromBlock === centreBlock) return 3
  if (fromDistrict === centreDistrict) return 22
  return 61
}

function radiusFor(mobility: Mobility): number {
  if (mobility === 'can-travel') return 70
  if (mobility === 'limited') return 25
  return 5
}

/**
 * Rules narrow the field — NSQF eligibility, seats, travel radius, literacy and
 * mobility. Nothing here is a judgement call: every filter is a fact about the caller
 * or the centre. The ordering that follows is the only "choice", and it is explainable.
 */
export function matchCourses(input: MatchInput): MatchResult[] {
  const centres = loadCentres()
  const gaps = loadBlockGaps()
  const radius = radiusFor(input.mobility)
  const results: MatchResult[] = []

  for (const centre of centres) {
    const distance = distanceFor(input.block, input.district, centre.block, centre.district)
    if (distance > radius) continue
    const seatsLeft = centre.capacity - centre.allotted
    if (seatsLeft <= 0) continue

    for (const courseName of centre.courses) {
      const record = courseRecord(courseName)
      if (!record) continue

      // NSQF eligibility for this education level.
      if (input.schoolYears !== null && input.schoolYears < record.minimumClass) continue
      // Literacy filter: no course that cannot be followed without reading.
      if (input.literacy === 'low' && record.needsLiteracy) continue
      // Mobility: someone who cannot leave the house needs a home-based trade.
      if (input.mobility === 'cannot-travel' && !record.homeBased) continue
      // A course needing a smartphone is no use without one.
      if (record.needsSmartphone && !input.hasSmartphone) continue

      const reasons: string[] = []
      const interestHit = input.interests.some(
        (interest) =>
          record.course.toLowerCase().includes(interest.toLowerCase()) ||
          record.whatYouLearn.toLowerCase().includes(interest.toLowerCase()) ||
          record.jobRole.toLowerCase().includes(interest.toLowerCase()),
      )
      if (interestHit) reasons.push('interest')
      if (input.familyTrade && record.course.toLowerCase().includes(input.familyTrade.toLowerCase())) {
        reasons.push('family-trade')
      }
      if (distance <= 5) reasons.push('close')
      if (input.workPreference === 'self-employment' && record.homeBased) reasons.push('own-work')
      if (input.workPreference === 'job' && !record.homeBased) reasons.push('employer-work')

      // Real local demand for the trade, from the same gap data the map is built on.
      const localDemand = gaps.some(
        (gap) => gap.block === centre.block && gap.course === courseName && gap.gapType === 'no-centre',
      )
      if (localDemand) reasons.push('local-demand')

      results.push({
        course: record,
        centreName: centre.name,
        centreBlock: centre.block,
        centreDistrict: centre.district,
        distanceKm: distance,
        seatsLeft,
        reasons,
        localDemand,
      })
    }
  }

  // Best fit first: most reasons matched, then nearest, then most seats.
  return results.sort(
    (a, b) => b.reasons.length - a.reasons.length || a.distanceKm - b.distanceKm || b.seatsLeft - a.seatsLeft,
  )
}
