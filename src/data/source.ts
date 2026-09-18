/**
 * Where the console's data actually comes from.
 *
 * Firestore is the source of truth, but a demo must never show an empty map because a
 * query timed out. So each collection has a slot holding the seeded sample data from the
 * start, which a successful query replaces. Readers stay synchronous — `loadBlockGaps()`
 * and `loadBeneficiaries()` keep their signatures — and React re-renders through
 * useSyncExternalStore when a slot is filled.
 *
 * The status is deliberately visible in the UI: an admin should be able to tell at a
 * glance whether they are looking at live data or the sample.
 */

export type SourceStatus = 'sample' | 'loading' | 'firestore' | 'error'

export interface SlotState<T> {
  status: SourceStatus
  items: T[]
  /** Set when a query failed, so the UI can say why it fell back. */
  error: string | null
  /** When the live data arrived, for the badge. */
  loadedAt: number | null
}

export type SlotName =
  | 'gaps'
  | 'beneficiaries'
  | 'calls'
  | 'followUps'
  | 'courses'
  | 'centres'
  | 'attendance'
  | 'adminFlags'
  | 'queue'
  | 'completed'
  | 'rpQueue'
  | 'rpCompleted'

export const SLOT_NAMES: SlotName[] = [
  'gaps',
  'beneficiaries',
  'calls',
  'followUps',
  'courses',
  'centres',
  'attendance',
  'adminFlags',
  'queue',
  'completed',
  'rpQueue',
  'rpCompleted',
]

function emptySlot(): SlotState<unknown> {
  return { status: 'sample', items: [], error: null, loadedAt: null }
}

const slots: Record<SlotName, SlotState<unknown>> = {
  gaps: emptySlot(),
  beneficiaries: emptySlot(),
  calls: emptySlot(),
  followUps: emptySlot(),
  courses: emptySlot(),
  centres: emptySlot(),
  attendance: emptySlot(),
  adminFlags: emptySlot(),
  queue: emptySlot(),
  completed: emptySlot(),
  rpQueue: emptySlot(),
  rpCompleted: emptySlot(),
}

const listeners = new Set<() => void>()
let version = 0

function announce(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function subscribeSource(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Changes only when a slot changes, so useSyncExternalStore stays stable. */
export function sourceVersion(): number {
  return version
}

/** Called once by each seed module at import: the fallback is in place before anything asks. */
export function registerSample<T>(slot: SlotName, items: T[]): void {
  if (slots[slot].status === 'sample') slots[slot].items = items as unknown[]
}

export function readSlot<T>(slot: SlotName): T[] {
  return slots[slot].items as T[]
}

export function slotState(slot: SlotName): SlotState<unknown> {
  return slots[slot]
}

export function markLoading(slot: SlotName): void {
  slots[slot] = { ...slots[slot], status: 'loading', error: null }
  announce()
}

export function fillFromFirestore<T>(slot: SlotName, items: T[]): void {
  slots[slot] = { status: 'firestore', items: items as unknown[], error: null, loadedAt: Date.now() }
  announce()
}

/** The query failed: keep whatever is in the slot and say what went wrong. */
export function markFailed(slot: SlotName, error: string): void {
  slots[slot] = { ...slots[slot], status: 'error', error }
  announce()
}
