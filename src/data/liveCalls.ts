/**
 * Calls produced by the simulated voice line, held for this session.
 *
 * A demo call has to land somewhere real: a completed call appears in the executive's
 * Completed Calls, an escalated one joins their queue, and either way its detection and
 * its block feed the Opportunity Gap Map. This module is that seam — an in-memory store
 * the seeded loaders merge with, so nothing else has to know where a record came from.
 *
 * In production these are writes to `calls`, `beneficiaries` and `gapData`.
 */

import type { LanguageDetection } from '../lib/languageDetection'
import type { CompletedCall, QueuedCall } from './jharkhandCalls'

export interface LiveDemand {
  block: string
  district: string
  course: string
  /** True when the caller was told there is no local work for that trade. */
  noLocalDemand: boolean
}

interface LiveState {
  completed: CompletedCall[]
  queued: QueuedCall[]
  detections: LanguageDetection[]
  demand: LiveDemand[]
}

const state: LiveState = { completed: [], queued: [], detections: [], demand: [] }
const listeners = new Set<() => void>()

/** React subscribes through useSyncExternalStore; everything else just reads. */
export function subscribeLiveCalls(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function announce(): void {
  for (const listener of listeners) listener()
}

/** A snapshot identity that only changes when something is added. */
let version = 0

export function liveVersion(): number {
  return version
}

export function liveCompleted(): CompletedCall[] {
  return state.completed
}

export function liveQueued(): QueuedCall[] {
  return state.queued
}

export function liveDetections(): LanguageDetection[] {
  return state.detections
}

export function liveDemand(): LiveDemand[] {
  return state.demand
}

export function addCompletedCall(call: CompletedCall, detection: LanguageDetection, demand?: LiveDemand): void {
  state.completed = [call, ...state.completed]
  state.detections = [detection, ...state.detections]
  if (demand) state.demand = [demand, ...state.demand]
  version += 1
  announce()
}

export function addQueuedCall(call: QueuedCall, detection: LanguageDetection, demand?: LiveDemand): void {
  state.queued = [call, ...state.queued]
  state.detections = [detection, ...state.detections]
  if (demand) state.demand = [demand, ...state.demand]
  version += 1
  announce()
}

/** Used by the demo reset, so a rehearsal does not leave rows behind. */
export function clearLiveCalls(): void {
  state.completed = []
  state.queued = []
  state.detections = []
  state.demand = []
  version += 1
  announce()
}
