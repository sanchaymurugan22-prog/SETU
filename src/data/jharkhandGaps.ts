/**
 * Sample data for the Opportunity Gap Map.
 *
 * Blocks are real Jharkhand blocks in their real districts, with coordinates at
 * block-town accuracy (roughly ±3 km) — enough for markers to land in the right
 * place on a real map, not survey-grade. The counts are invented but internally
 * consistent: every figure on screen is computed from what is here.
 *
 * In production this comes from the `gapData` collection (SETU-SPEC.md 8.9),
 * aggregated from beneficiaries + centres + courses. `loadBlockGaps()` is the
 * single place to swap in that query.
 */

export type GapType = 'no-centre' | 'no-local-jobs'

import { liveDemand } from './liveCalls'

export interface BlockGap {
  gapId: string
  block: string
  district: string
  latitude: number
  longitude: number
  course: string
  gapType: GapType
  /** Demand with no centre, or trained people with no local work. Drives marker size. */
  peopleAffected: number
  demandCount: number
  centreCapacity: number
  trainedCount: number
  placedCount: number
  unplacedCount: number
  nearestCentreKm: number | null
  severity: 'high' | 'medium' | 'low'
  /** How long this gap has been flagged — what the time-window filter uses. */
  flaggedDaysAgo: number
  detail: string
  recommendedAction: string
}

const BLOCK_GAPS: BlockGap[] = [
  {
    gapId: 'gap-ghaghra-tailoring',
    block: 'Ghaghra',
    district: 'Gumla',
    latitude: 23.2167,
    longitude: 84.55,
    course: 'Tailoring L1',
    gapType: 'no-centre',
    peopleAffected: 60,
    demandCount: 60,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 41,
    severity: 'high',
    flaggedDaysAgo: 12,
    detail: '60 callers asked for tailoring. No centre in the block; the nearest is 41 km away.',
    recommendedAction: 'Sanction one tailoring centre at Ghaghra to serve three adjoining blocks.',
  },
  {
    gapId: 'gap-maheshpur-tailoring',
    block: 'Maheshpur',
    district: 'Pakur',
    latitude: 24.7167,
    longitude: 87.6333,
    course: 'Tailoring L1',
    gapType: 'no-centre',
    peopleAffected: 47,
    demandCount: 47,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 52,
    severity: 'high',
    flaggedDaysAgo: 26,
    detail: '47 callers, mostly Santali speakers, asked for tailoring. No centre in the block.',
    recommendedAction: 'Sanction a centre with a Santali-speaking trainer; pairs with the dialect gap.',
  },
  {
    gapId: 'gap-hussainabad-wiring',
    block: 'Hussainabad',
    district: 'Palamu',
    latitude: 24.5333,
    longitude: 84.0,
    course: 'Electrical wiring',
    gapType: 'no-centre',
    peopleAffected: 52,
    demandCount: 52,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 38,
    severity: 'high',
    flaggedDaysAgo: 34,
    detail: '52 callers want electrical wiring. A centre is proposed but not yet sanctioned.',
    recommendedAction: 'Clear the pending sanction; demand has held for three quarters.',
  },
  {
    gapId: 'gap-torpa-driving',
    block: 'Torpa',
    district: 'Khunti',
    latitude: 22.9333,
    longitude: 85.2,
    course: 'Driving (LMV)',
    gapType: 'no-centre',
    peopleAffected: 44,
    demandCount: 44,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 47,
    severity: 'high',
    flaggedDaysAgo: 45,
    detail: '44 callers want driving licence training. No centre within reach.',
    recommendedAction: 'A mobile driving unit could cover Torpa, Rania and Karra together.',
  },
  {
    gapId: 'gap-madhupur-tailoring',
    block: 'Madhupur',
    district: 'Deoghar',
    latitude: 24.2667,
    longitude: 86.6333,
    course: 'Tailoring L1',
    gapType: 'no-centre',
    peopleAffected: 42,
    demandCount: 42,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 29,
    severity: 'medium',
    flaggedDaysAgo: 58,
    detail: '42 callers want tailoring. The nearest centre is full with a 31-person queue.',
    recommendedAction: 'Add a second batch at Deoghar or open a block centre at Madhupur.',
  },
  {
    gapId: 'gap-bishunpur-food',
    block: 'Bishunpur',
    district: 'Gumla',
    latitude: 23.3833,
    longitude: 84.4,
    course: 'Food processing',
    gapType: 'no-centre',
    peopleAffected: 38,
    demandCount: 38,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 44,
    severity: 'medium',
    flaggedDaysAgo: 63,
    detail: '38 callers, mostly women, asked for food processing. No centre in the block.',
    recommendedAction: 'Attach a food-processing batch to the existing SHG cluster.',
  },
  {
    gapId: 'gap-balumath-welding',
    block: 'Balumath',
    district: 'Latehar',
    latitude: 23.8333,
    longitude: 84.7,
    course: 'Welding L1',
    gapType: 'no-centre',
    peopleAffected: 36,
    demandCount: 36,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 35,
    severity: 'medium',
    flaggedDaysAgo: 71,
    detail: '36 callers want welding. Local contractors report steady demand for welders.',
    recommendedAction: 'Sanction a welding bench; placement demand already exists nearby.',
  },
  {
    gapId: 'gap-mandar-beauty',
    block: 'Mandar',
    district: 'Ranchi',
    latitude: 23.4667,
    longitude: 85.1667,
    course: 'Beauty & wellness',
    gapType: 'no-centre',
    peopleAffected: 34,
    demandCount: 34,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 24,
    severity: 'medium',
    flaggedDaysAgo: 80,
    detail: '34 callers want beauty and wellness training. The Ranchi hub is at capacity.',
    recommendedAction: 'Raise capacity at Mandar Skill Hub by one batch.',
  },
  {
    gapId: 'gap-barhi-mobile',
    block: 'Barhi',
    district: 'Hazaribagh',
    latitude: 24.2833,
    longitude: 85.4167,
    course: 'Mobile repair',
    gapType: 'no-centre',
    peopleAffected: 33,
    demandCount: 33,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 31,
    severity: 'medium',
    flaggedDaysAgo: 88,
    detail: '33 callers want mobile repair training, driven by the NH-33 market cluster.',
    recommendedAction: 'Convert the idle trade centre room to a mobile-repair bench.',
  },
  {
    gapId: 'gap-chainpur-tailoring',
    block: 'Chainpur',
    district: 'Palamu',
    latitude: 23.9833,
    longitude: 84.1833,
    course: 'Tailoring L1',
    gapType: 'no-centre',
    peopleAffected: 31,
    demandCount: 31,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 33,
    severity: 'medium',
    flaggedDaysAgo: 104,
    detail: '31 callers want tailoring. Demand has been steady for two quarters.',
    recommendedAction: 'Pair with Hussainabad sanction to share one trainer.',
  },
  {
    gapId: 'gap-garhwa-masonry',
    block: 'Garhwa',
    district: 'Garhwa',
    latitude: 24.1667,
    longitude: 83.8,
    course: 'Masonry',
    gapType: 'no-centre',
    peopleAffected: 30,
    demandCount: 30,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 40,
    severity: 'medium',
    flaggedDaysAgo: 132,
    detail: '30 callers want masonry training, with construction work active in the district.',
    recommendedAction: 'Sanction a masonry batch tied to district construction contracts.',
  },
  {
    gapId: 'gap-tamar-driving',
    block: 'Tamar',
    district: 'Ranchi',
    latitude: 23.1,
    longitude: 85.65,
    course: 'Driving (LMV)',
    gapType: 'no-centre',
    peopleAffected: 29,
    demandCount: 29,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 39,
    severity: 'low',
    flaggedDaysAgo: 168,
    detail: '29 callers want driving training; several cite work at the Ranchi freight yards.',
    recommendedAction: 'Include Tamar in the proposed mobile driving unit circuit.',
  },
  {
    gapId: 'gap-markacho-wiring',
    block: 'Markacho',
    district: 'Koderma',
    latitude: 24.4,
    longitude: 85.75,
    course: 'Electrical wiring',
    gapType: 'no-centre',
    peopleAffected: 27,
    demandCount: 27,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 26,
    severity: 'low',
    flaggedDaysAgo: 205,
    detail: '27 callers want electrical wiring. The Koderma centre runs one batch only.',
    recommendedAction: 'Add an evening batch at Koderma before sanctioning a new centre.',
  },
  {
    gapId: 'gap-kisko-food',
    block: 'Kisko',
    district: 'Lohardaga',
    latitude: 23.55,
    longitude: 84.55,
    course: 'Food processing',
    gapType: 'no-centre',
    peopleAffected: 25,
    demandCount: 25,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 22,
    severity: 'low',
    flaggedDaysAgo: 240,
    detail: '25 callers want food processing. The women’s centre has one seat free.',
    recommendedAction: 'Raise capacity at Kisko Women’s Centre rather than build new.',
  },
  {
    gapId: 'gap-bano-beauty',
    block: 'Bano',
    district: 'Simdega',
    latitude: 22.7333,
    longitude: 84.95,
    course: 'Beauty & wellness',
    gapType: 'no-centre',
    peopleAffected: 22,
    demandCount: 22,
    centreCapacity: 0,
    trainedCount: 0,
    placedCount: 0,
    unplacedCount: 0,
    nearestCentreKm: 36,
    severity: 'low',
    flaggedDaysAgo: 291,
    detail: '22 callers want beauty and wellness training. No centre in Simdega district.',
    recommendedAction: 'Assess a district-level centre at Simdega covering Bano and Kolebira.',
  },

  {
    gapId: 'gap-angara-welding',
    block: 'Angara',
    district: 'Ranchi',
    latitude: 23.4167,
    longitude: 85.6167,
    course: 'Welding L2',
    gapType: 'no-local-jobs',
    peopleAffected: 40,
    demandCount: 0,
    centreCapacity: 40,
    trainedCount: 52,
    placedCount: 12,
    unplacedCount: 40,
    nearestCentreKm: 0,
    severity: 'high',
    flaggedDaysAgo: 18,
    detail: '40 of 52 trained welders have no work. No employer within 60 km is hiring.',
    recommendedAction: 'Hold a placement drive with Bokaro and Ranchi fabricators, or redirect to L3.',
  },
  {
    gapId: 'gap-satgawan-tailoring',
    block: 'Satgawan',
    district: 'Koderma',
    latitude: 24.5833,
    longitude: 85.6833,
    course: 'Tailoring L2',
    gapType: 'no-local-jobs',
    peopleAffected: 31,
    demandCount: 0,
    centreCapacity: 20,
    trainedCount: 44,
    placedCount: 13,
    unplacedCount: 31,
    nearestCentreKm: 0,
    severity: 'high',
    flaggedDaysAgo: 29,
    detail: '31 certified tailors have no local buyers. The nearest SHG cluster is 28 km away.',
    recommendedAction: 'Link the batch to the Koderma SHG cluster and a piece-work contract.',
  },
  {
    gapId: 'gap-chandil-masonry',
    block: 'Chandil',
    district: 'Saraikela-Kharsawan',
    latitude: 22.9667,
    longitude: 86.05,
    course: 'Masonry',
    gapType: 'no-local-jobs',
    peopleAffected: 27,
    demandCount: 0,
    centreCapacity: 40,
    trainedCount: 39,
    placedCount: 12,
    unplacedCount: 27,
    nearestCentreKm: 0,
    severity: 'medium',
    flaggedDaysAgo: 41,
    detail: '27 trained masons find seasonal work only; earnings stop outside the building season.',
    recommendedAction: 'Tie certification to the district construction contractor panel.',
  },
  {
    gapId: 'gap-basia-welding',
    block: 'Basia',
    district: 'Gumla',
    latitude: 22.8667,
    longitude: 84.75,
    course: 'Welding L1',
    gapType: 'no-local-jobs',
    peopleAffected: 20,
    demandCount: 0,
    centreCapacity: 30,
    trainedCount: 26,
    placedCount: 6,
    unplacedCount: 20,
    nearestCentreKm: 0,
    severity: 'medium',
    flaggedDaysAgo: 66,
    detail: '20 of 26 trained welders are unplaced; the block has no fabrication units.',
    recommendedAction: 'Route to the Gumla industrial cluster or offer self-employment tooling.',
  },
  {
    gapId: 'gap-chas-welding',
    block: 'Chas',
    district: 'Bokaro',
    latitude: 23.6333,
    longitude: 86.1667,
    course: 'Welding L2',
    gapType: 'no-local-jobs',
    peopleAffected: 17,
    demandCount: 0,
    centreCapacity: 40,
    trainedCount: 31,
    placedCount: 14,
    unplacedCount: 17,
    nearestCentreKm: 0,
    severity: 'medium',
    flaggedDaysAgo: 77,
    detail: '17 trained welders await placement despite the Bokaro industrial belt nearby.',
    recommendedAction: 'Escalate to the Bokaro employer panel; placement capacity exists.',
  },
  {
    gapId: 'gap-nirsa-wiring',
    block: 'Nirsa',
    district: 'Dhanbad',
    latitude: 23.7833,
    longitude: 86.7167,
    course: 'Electrical wiring',
    gapType: 'no-local-jobs',
    peopleAffected: 17,
    demandCount: 0,
    centreCapacity: 25,
    trainedCount: 28,
    placedCount: 11,
    unplacedCount: 17,
    nearestCentreKm: 0,
    severity: 'medium',
    flaggedDaysAgo: 96,
    detail: '17 certified electricians have no contractor work; most report irregular calls only.',
    recommendedAction: 'Register the batch with the Dhanbad licensed-contractor list.',
  },
  {
    gapId: 'gap-barkagaon-masonry',
    block: 'Barkagaon',
    district: 'Hazaribagh',
    latitude: 23.8167,
    longitude: 85.1667,
    course: 'Masonry',
    gapType: 'no-local-jobs',
    peopleAffected: 17,
    demandCount: 0,
    centreCapacity: 30,
    trainedCount: 25,
    placedCount: 8,
    unplacedCount: 17,
    nearestCentreKm: 0,
    severity: 'low',
    flaggedDaysAgo: 149,
    detail: '17 trained masons remain unplaced after the local project pipeline paused.',
    recommendedAction: 'Re-check demand after the district road tenders are awarded.',
  },
  {
    gapId: 'gap-chakradharpur-driving',
    block: 'Chakradharpur',
    district: 'West Singhbhum',
    latitude: 22.6833,
    longitude: 85.6333,
    course: 'Driving (LMV)',
    gapType: 'no-local-jobs',
    peopleAffected: 17,
    demandCount: 0,
    centreCapacity: 15,
    trainedCount: 24,
    placedCount: 7,
    unplacedCount: 17,
    nearestCentreKm: 0,
    severity: 'low',
    flaggedDaysAgo: 186,
    detail: '17 licensed drivers have no steady work; transport operators hire seasonally.',
    recommendedAction: 'Connect to the Jamshedpur transport operators’ hiring rounds.',
  },
  {
    gapId: 'gap-khunti-mobile',
    block: 'Khunti',
    district: 'Khunti',
    latitude: 23.0716,
    longitude: 85.2784,
    course: 'Mobile repair',
    gapType: 'no-local-jobs',
    peopleAffected: 13,
    demandCount: 0,
    centreCapacity: 25,
    trainedCount: 22,
    placedCount: 9,
    unplacedCount: 13,
    nearestCentreKm: 0,
    severity: 'low',
    flaggedDaysAgo: 268,
    detail: '13 trained repairers are unplaced; the block market supports few shops.',
    recommendedAction: 'Offer a self-employment toolkit and shop-setup grant instead of placement.',
  },
]

/** Statewide totals behind the rate cards, per time window. */
export interface StatewideTotals {
  callers: number
  enrolled: number
  completed: number
  placed: number
  /** Change in percentage points against the previous period of the same length. */
  enrollmentDelta: number
  completionDelta: number
  placementDelta: number
}

export const TIME_WINDOWS = [
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
] as const

export type WindowDays = (typeof TIME_WINDOWS)[number]['days']

export const DEFAULT_WINDOW: WindowDays = 90

const STATEWIDE: Record<WindowDays, StatewideTotals> = {
  30: {
    callers: 16420,
    enrolled: 11330,
    completed: 6118,
    placed: 2325,
    enrollmentDelta: 1.1,
    completionDelta: -0.9,
    placementDelta: -1.4,
  },
  90: {
    callers: 48210,
    enrolled: 34712,
    completed: 20133,
    placed: 8255,
    enrollmentDelta: 4.2,
    completionDelta: 1.6,
    placementDelta: -2.8,
  },
  365: {
    callers: 96480,
    enrolled: 71395,
    completed: 43551,
    placed: 19162,
    enrollmentDelta: 5.0,
    completionDelta: 2.3,
    placementDelta: -1.2,
  },
}

export const PLACEMENT_TARGET = 55

/** Swap this for a Firestore query on `gapData` when the collection is populated. */
export function loadBlockGaps(): BlockGap[] {
  return BLOCK_GAPS
}

/**
 * Gaps inside the window, with anything the live voice line reported folded in. A demo
 * call from a block raises that block's demand by one — or puts the block on the map if
 * it was not there — so the call can be shown landing on the map straight afterwards.
 */
export function gapsInWindow(windowDays: WindowDays): BlockGap[] {
  const gaps = loadBlockGaps()
    .filter((gap) => gap.flaggedDaysAgo <= windowDays)
    .map((gap) => ({ ...gap }))

  for (const entry of liveDemand()) {
    const existing = gaps.find((gap) => gap.block === entry.block && gap.course === entry.course)
    if (existing) {
      existing.demandCount += 1
      existing.peopleAffected += 1
      existing.flaggedDaysAgo = 0
      continue
    }
    const known = loadBlockGaps().find((gap) => gap.block === entry.block)
    if (!known) continue
    gaps.push({
      ...known,
      gapId: `${known.gapId}-live`,
      course: entry.course,
      gapType: entry.noLocalDemand ? 'no-local-jobs' : 'no-centre',
      demandCount: 1,
      peopleAffected: 1,
      flaggedDaysAgo: 0,
      detail: `Reported on a live call today: ${entry.course} wanted in ${entry.block}.`,
    })
  }

  return gaps.sort((a, b) => b.peopleAffected - a.peopleAffected)
}

export function statewideTotals(windowDays: WindowDays): StatewideTotals {
  return STATEWIDE[windowDays]
}

export interface CourseDemand {
  course: string
  people: number
}

/** Demand by course across the flagged blocks in this window, largest first. */
export function courseDemand(gaps: BlockGap[]): CourseDemand[] {
  const totals = new Map<string, number>()
  for (const gap of gaps) {
    if (gap.demandCount > 0) totals.set(gap.course, (totals.get(gap.course) ?? 0) + gap.demandCount)
  }
  return [...totals.entries()]
    .map(([course, people]) => ({ course, people }))
    .sort((a, b) => b.people - a.people)
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN')
}
