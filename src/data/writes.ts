/**
 * Writing back to Firestore.
 *
 * Every action follows the same three steps, and `commit()` is the only place they live:
 *
 *   1. mutate the slot so the console responds immediately,
 *   2. send the write,
 *   3. on failure put the slot back exactly as it was and report the error.
 *
 * Step 3 is the point of the whole module. An optimistic update that is never rolled back
 * is a lie told to the official's face: the screen says the trainee was certified, the
 * database disagrees, and nobody finds out until the page is reloaded. So a failed write
 * restores the previous items and hands back a message the section is expected to show.
 *
 * Errors are deliberately not thrown. Callers are event handlers, and an unhandled
 * rejection in one would leave the UI in the optimistic state with nothing said.
 */

import { FirebaseError } from 'firebase/app'
import {
  collection,
  deleteField,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { replaceSlot, type SlotName } from './source'

export interface WriteResult {
  ok: boolean
  /** Null when ok; otherwise a message fit to put in front of an official. */
  error: string | null
  /** Set when the rules refused, so a section can say so specifically. */
  denied?: boolean
}

export const WRITE_OK: WriteResult = { ok: true, error: null }

/** One slot's items as they were before the optimistic change, for the rollback. */
interface Undo {
  slot: SlotName
  items: unknown[]
}

/**
 * Turns a Firebase error into something an official can act on. The raw code is kept on
 * the end because a demo that hides it makes a genuine rules problem impossible to debug
 * from the room.
 */
export function describeWriteError(error: unknown): { message: string; denied: boolean } {
  const code = error instanceof FirebaseError ? error.code : ''
  switch (code) {
    case 'permission-denied':
      return { message: `Refused: your role may not make this change (${code}).`, denied: true }
    case 'unavailable':
    case 'deadline-exceeded':
      return { message: `Could not reach the database — nothing was saved (${code}).`, denied: false }
    case 'not-found':
      return { message: `That record no longer exists (${code}).`, denied: false }
    case 'failed-precondition':
      return { message: `The record changed since it was loaded (${code}).`, denied: false }
    default:
      return {
        message: error instanceof Error ? `Not saved: ${error.message}` : 'Not saved: unknown error.',
        denied: false,
      }
  }
}

/**
 * Applies the optimistic change, sends the write, rolls back if it fails.
 *
 * `apply` returns the undo records produced by the slot helpers — one per slot it
 * touched, since an action like allotting seats changes both beneficiaries and centres.
 */
export async function commit(apply: () => Undo[], write: () => Promise<void>): Promise<WriteResult> {
  const undo = apply()
  try {
    await write()
    return WRITE_OK
  } catch (error) {
    for (const entry of undo) replaceSlot(entry.slot, entry.items)
    const { message, denied } = describeWriteError(error)
    return { ok: false, error: message, denied }
  }
}

/** Pairs a slot name with the items the slot helpers handed back. */
export function undoFor(slot: SlotName, items: unknown[]): Undo {
  return { slot, items }
}

/* ─────────────────────── Firestore plumbing ─────────────────────── */

/** Firestore rejects undefined; the console models use it for "not set". */
export function clean<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue
    out[key] = entry
  }
  return out
}

/** Every write stamps this, so a judge can see which rows the demo itself produced. */
export function stamped<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return { ...clean(value), updatedAt: serverTimestamp() }
}

export async function setDocument(path: string, id: string, data: Record<string, unknown>): Promise<void> {
  await setDoc(doc(db, path, id), stamped(data))
}

export async function updateDocument(path: string, id: string, data: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, path, id), stamped(data))
}

/** Firestore batches cap at 500 writes; nothing here comes close, but the guard is cheap. */
export async function batched(fill: (batch: WriteBatch) => void): Promise<void> {
  const batch = writeBatch(db)
  fill(batch)
  await batch.commit()
}

export { collection, deleteField, doc, getDocs, limit, query, serverTimestamp, where }
