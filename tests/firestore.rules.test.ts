// Security-rules tests against the Firestore emulator. Run with: npm run test:rules
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

const ADMIN = 'admin-1'
const EXEC = 'exec-1'
const EXEC2 = 'exec-2'
const RP = 'rp-1'
const RP2 = 'rp-2'
const INACTIVE = 'inactive-1'
const NO_ROLE = 'no-role-1'

let env: RulesTestEnvironment

function as(uid: string): Firestore {
  return env.authenticatedContext(uid).firestore() as unknown as Firestore
}

function staff(role: string, isActive = true) {
  return { role, isActive, name: `${role} user`, email: `${role}@setu.test` }
}

/** Accept a queued call the way the Call Console will: claim the call and take the beneficiary lock together. */
function acceptCall(db: Firestore, uid: string, callId: string, beneficiaryId: string) {
  const batch = writeBatch(db)
  // Exactly what src/data/actions.ts sends, updatedAt stamp included — a helper that
  // writes fewer fields than the console does would pass a rule the console then fails.
  batch.update(doc(db, 'calls', callId), {
    status: 'active',
    handledBy: uid,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'beneficiaries', beneficiaryId), { activeHandler: uid, activeCallId: callId })
  return batch.commit()
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-setu-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore
    const writes: Array<[string, Record<string, unknown>]> = [
      [`users/${ADMIN}`, staff('admin')],
      [`users/${EXEC}`, staff('executive')],
      [`users/${EXEC2}`, staff('executive')],
      [`users/${RP}`, staff('resourcePerson')],
      [`users/${RP2}`, staff('resourcePerson')],
      [`users/${INACTIVE}`, staff('executive', false)],

      ['beneficiaries/ben-1', { name: 'Sunita Devi', primaryNumber: '+91 94310 24718', assignedResourcePerson: RP, trainingStatus: 'enrolled', employmentStatus: 'in-training', activeHandler: null, activeCallId: null }],
      ['beneficiaries/ben-2', { name: 'Ramesh Oraon', primaryNumber: '+91 90062 11840', assignedResourcePerson: RP2, trainingStatus: 'enrolled', employmentStatus: 'in-training', activeHandler: null, activeCallId: null }],

      ['calls/queued-1', { callType: 'executive', status: 'waiting', handledBy: null, beneficiaryId: 'ben-1', queue: { reasonTag: 'ai-low-confidence' } }],
      ['calls/queued-1/private/detail', { transcript: 'Caller said her name is Sunita…' }],
      ['calls/queued-2', { callType: 'executive', status: 'waiting', handledBy: null, beneficiaryId: 'ben-2', queue: { reasonTag: 'course-question' } }],
      ['calls/done-by-exec2', { callType: 'executive', status: 'completed', handledBy: EXEC2, beneficiaryId: 'ben-2', aiReport: { summary: 'Asked about fees.' } }],
      ['calls/ai-1', { callType: 'ai', status: 'completed', handledBy: null, beneficiaryId: 'ben-1' }],
      // recordType tells the admin's overview rows apart from the queue entries and the
      // reports the consoles read; all three live in /calls (spec 8.3).
      ['calls/q-exec-1', { recordType: 'queued', callType: 'executive', status: 'waiting', handledBy: null, beneficiaryId: 'ben-1' }],
      ['calls/c-exec-1', { recordType: 'completed', callType: 'executive', status: 'completed', handledBy: EXEC, beneficiaryId: 'ben-1' }],
      ['calls/q-rp-1', { recordType: 'queued', callType: 'resourcePerson', status: 'waiting', handledBy: null, assignedTo: RP, beneficiaryId: 'ben-1' }],
      ['calls/c-rp-1', { recordType: 'completed', callType: 'resourcePerson', status: 'completed', handledBy: RP, assignedTo: RP, beneficiaryId: 'ben-1' }],
      ['calls/sys-1', { recordType: 'system', callType: 'ai', status: 'completed', handledBy: null, beneficiaryId: 'ben-1' }],
      ['calls/rp-case-1', { callType: 'resourcePerson', subType: 'course-related', status: 'waiting', handledBy: null, assignedTo: RP, beneficiaryId: 'ben-1' }],

      ['courses/tailoring-l1', { courseName: 'Tailoring L1' }],
      ['centres/centre-1', { courseId: 'tailoring-l1', assignedResourcePerson: RP, capacity: 30 }],
      ['followUps/fu-1', { beneficiaryId: 'ben-1', purpose: 'did-you-enroll' }],
      ['gapData/gap-1', { demandCount: 60, gapType: 'no-centre' }],

      ['attendance/att-1', { beneficiaryId: 'ben-1', centreId: 'centre-1', markedBy: RP, mark: 'present', sessionNumber: 1 }],
      ['attendance/att-2', { beneficiaryId: 'ben-2', centreId: 'centre-2', markedBy: RP2, mark: 'absent', sessionNumber: 1 }],

      ['adminFlags/flag-rp', { beneficiaryId: 'ben-1', raisedBy: RP, status: 'open', reason: 'repeated-absence', note: 'Missed four sessions in a row.' }],
      ['adminFlags/flag-rp2', { beneficiaryId: 'ben-2', raisedBy: RP2, status: 'open', reason: 'travel-cost' }],

      // The Admin console's staff directory, and the batches a trainer maintains.
      ['staff/exec-mahato', { role: 'executive', name: 'A. Mahato', active: true, district: 'Ranchi' }],
      ['staff/rp-devi', { role: 'resourcePerson', name: 'S. Devi', active: true, centre: 'Ghaghra Training Centre', courses: ['Tailoring L1'] }],
      ['batches/GH-L1', { batchId: 'GH-L1', course: 'Tailoring L1', centre: 'Ghaghra Training Centre', assignedResourcePerson: RP, schedule: { days: [1, 3], startTime: '10:00', endTime: '13:00' }, materials: [] }],
      ['batches/AN-L1', { batchId: 'AN-L1', course: 'Welding L1', centre: 'Angara Works Centre', assignedResourcePerson: RP2, schedule: { days: [2], startTime: '09:00', endTime: '12:00' }, materials: [] }],
    ]
    await Promise.all(writes.map(([path, data]) => setDoc(doc(db, path), data)))
  })
})

describe('users', () => {
  it('denies signed-out visitors', async () => {
    const db = env.unauthenticatedContext().firestore() as unknown as Firestore
    await assertFails(getDoc(doc(db, 'users', EXEC)))
  })

  it('lets active staff read their own record and the staff directory', async () => {
    await assertSucceeds(getDoc(doc(as(EXEC), 'users', EXEC)))
    await assertSucceeds(getDoc(doc(as(EXEC), 'users', RP)))
  })

  it('lets an account with no users record read only its own (missing) record', async () => {
    await assertSucceeds(getDoc(doc(as(NO_ROLE), 'users', NO_ROLE)))
    await assertFails(getDoc(doc(as(NO_ROLE), 'users', EXEC)))
    await assertFails(getDoc(doc(as(NO_ROLE), 'courses', 'tailoring-l1')))
  })

  it('locks a deactivated official out of everything but their own record', async () => {
    await assertSucceeds(getDoc(doc(as(INACTIVE), 'users', INACTIVE)))
    await assertFails(getDoc(doc(as(INACTIVE), 'courses', 'tailoring-l1')))
    await assertFails(getDocs(query(collection(as(INACTIVE), 'calls'), where('callType', '==', 'executive'), where('status', '==', 'waiting'))))
  })

  it('lets only admins create accounts or change roles', async () => {
    await assertFails(updateDoc(doc(as(EXEC), 'users', EXEC), { role: 'admin' }))
    await assertSucceeds(setDoc(doc(as(ADMIN), 'users', 'new-exec'), staff('executive')))
    await assertFails(setDoc(doc(as(ADMIN), 'users', 'bad-role'), staff('superuser')))
  })
})

describe('call visibility', () => {
  it('shows every executive the waiting queue', async () => {
    const q = query(collection(as(EXEC), 'calls'), where('callType', '==', 'executive'), where('status', '==', 'waiting'))
    await assertSucceeds(getDocs(q))
  })

  it("hides AI calls, resource-person calls and other executives' calls from executives", async () => {
    await assertFails(getDoc(doc(as(EXEC), 'calls', 'ai-1')))
    await assertFails(getDoc(doc(as(EXEC), 'calls', 'rp-case-1')))
    await assertFails(getDoc(doc(as(EXEC), 'calls', 'done-by-exec2')))
    await assertSucceeds(getDoc(doc(as(EXEC2), 'calls', 'done-by-exec2')))
  })

  it("lists an executive's own completed calls", async () => {
    const q = query(collection(as(EXEC2), 'calls'), where('callType', '==', 'executive'), where('handledBy', '==', EXEC2))
    await assertSucceeds(getDocs(q))
  })

  it('shows a resource person only the cases assigned to them', async () => {
    await assertSucceeds(getDoc(doc(as(RP), 'calls', 'rp-case-1')))
    await assertFails(getDoc(doc(as(RP2), 'calls', 'rp-case-1')))
    await assertFails(getDoc(doc(as(RP), 'calls', 'queued-1')))
    const q = query(collection(as(RP), 'calls'), where('callType', '==', 'resourcePerson'), where('assignedTo', '==', RP))
    await assertSucceeds(getDocs(q))
  })

  it('shows admins every call, including AI calls', async () => {
    await assertSucceeds(getDoc(doc(as(ADMIN), 'calls', 'ai-1')))
    await assertSucceeds(getDocs(collection(as(ADMIN), 'calls')))
  })
})

describe('beneficiary privacy through the call lifecycle', () => {
  it('hides identity and transcript while the call is only queued', async () => {
    await assertFails(getDoc(doc(as(EXEC), 'beneficiaries', 'ben-1')))
    await assertFails(getDoc(doc(as(EXEC), 'calls', 'queued-1', 'private', 'detail')))
  })

  it('reveals identity during the call, locks edits at the end, and hides it again after the report', async () => {
    const db = as(EXEC)
    const beneficiary = doc(db, 'beneficiaries', 'ben-1')
    const call = doc(db, 'calls', 'queued-1')

    // Stage 2 — active call
    await assertSucceeds(acceptCall(db, EXEC, 'queued-1', 'ben-1'))
    await assertSucceeds(getDoc(beneficiary))
    await assertSucceeds(getDoc(doc(db, 'calls', 'queued-1', 'private', 'detail')))
    await assertSucceeds(updateDoc(beneficiary, { name: 'Sunita Devi Oraon', secondaryNumber: '+91 90000 00000' }))
    await assertSucceeds(updateDoc(doc(db, 'calls', 'queued-1', 'private', 'detail'), { notes: 'Prefers mornings.' }))
    await assertFails(updateDoc(beneficiary, { assignedResourcePerson: EXEC }))

    // Stage 3 — report review: still visible, no longer editable
    await assertSucceeds(updateDoc(call, { status: 'report-review', endedAt: serverTimestamp(), duration: 222 }))
    await assertSucceeds(getDoc(beneficiary))
    await assertFails(updateDoc(beneficiary, { name: 'Changed after the call' }))

    // Send — report saved, lock released
    const send = writeBatch(db)
    send.update(call, { status: 'completed', editedReport: 'Reviewed.', reportSentAt: serverTimestamp(), reportChannels: ['sms-primary'] })
    send.update(beneficiary, { activeHandler: null, activeCallId: null })
    await assertSucceeds(send.commit())

    // Completed Calls — report only
    await assertFails(getDoc(beneficiary))
    await assertFails(getDoc(doc(db, 'calls', 'queued-1', 'private', 'detail')))
    await assertSucceeds(getDoc(call))
    await assertFails(updateDoc(call, { editedReport: 'Rewritten later' }))
  })

  it("refuses to unlock a beneficiary who isn't on the accepted call", async () => {
    const db = as(EXEC)
    const batch = writeBatch(db)
    batch.update(doc(db, 'calls', 'queued-1'), { status: 'active', handledBy: EXEC })
    batch.update(doc(db, 'beneficiaries', 'ben-2'), { activeHandler: EXEC, activeCallId: 'queued-1' })
    await assertFails(batch.commit())
  })

  it('refuses to take the lock without claiming the call', async () => {
    await assertFails(updateDoc(doc(as(EXEC), 'beneficiaries', 'ben-1'), { activeHandler: EXEC, activeCallId: 'queued-1' }))
  })

  it('lets only the first executive accept a call', async () => {
    await assertSucceeds(acceptCall(as(EXEC), EXEC, 'queued-1', 'ben-1'))
    await assertFails(acceptCall(as(EXEC2), EXEC2, 'queued-1', 'ben-1'))
    await assertFails(getDoc(doc(as(EXEC2), 'beneficiaries', 'ben-1')))
  })

  it('stops a resource person from accepting executive calls', async () => {
    await assertFails(acceptCall(as(RP), RP, 'queued-2', 'ben-2'))
  })
})

describe('transfer to a resource person', () => {
  it('lets an executive create a callback case from their active call', async () => {
    const db = as(EXEC)
    await acceptCall(db, EXEC, 'queued-1', 'ben-1')

    const batch = writeBatch(db)
    batch.set(doc(db, 'calls', 'transfer-1'), {
      callType: 'resourcePerson',
      subType: 'course-related',
      status: 'waiting',
      handledBy: null,
      assignedTo: RP,
      beneficiaryId: 'ben-1',
      transferredFromCallId: 'queued-1',
      queue: { reasonTag: 'course-question' },
    })
    batch.update(doc(db, 'calls', 'queued-1'), { transferredTo: RP, transferReason: 'course-question' })
    await assertSucceeds(batch.commit())

    await assertSucceeds(getDoc(doc(as(RP), 'calls', 'transfer-1')))
    await assertFails(getDoc(doc(as(RP2), 'calls', 'transfer-1')))
  })

  it('refuses a transfer from a call the executive is not handling', async () => {
    await assertFails(
      setDoc(doc(as(EXEC), 'calls', 'transfer-2'), {
        callType: 'resourcePerson',
        subType: 'common-related',
        status: 'waiting',
        handledBy: null,
        assignedTo: RP,
        beneficiaryId: 'ben-1',
        transferredFromCallId: 'queued-1',
      }),
    )
  })
})

describe('trainer access', () => {
  it('shows a resource person their own trainees only', async () => {
    await assertSucceeds(getDoc(doc(as(RP), 'beneficiaries', 'ben-1')))
    await assertFails(getDoc(doc(as(RP), 'beneficiaries', 'ben-2')))
    await assertSucceeds(getDocs(query(collection(as(RP), 'beneficiaries'), where('assignedResourcePerson', '==', RP))))
  })

  it('lets a trainer update status but not reassign the trainee', async () => {
    const beneficiary = doc(as(RP), 'beneficiaries', 'ben-1')
    await assertSucceeds(
      updateDoc(beneficiary, {
        trainingStatus: 'attending',
        statusHistory: [{ status: 'attending', description: 'Attended first week.', changedBy: RP }],
      }),
    )
    // Certified and unplaced at the same time: two fields, one update.
    await assertSucceeds(
      updateDoc(beneficiary, {
        trainingStatus: 'certified',
        employmentStatus: 'unplaced',
        statusHistory: [{ status: 'certified', description: 'Passed the assessment.', changedBy: RP }],
      }),
    )
    await assertFails(updateDoc(beneficiary, { assignedResourcePerson: RP2 }))
    await assertFails(updateDoc(beneficiary, { primaryNumber: '+91 99999 99999' }))
  })

  it('lets a trainer flag only their own trainees to the admin', async () => {
    await assertSucceeds(setDoc(doc(as(RP), 'adminFlags', 'flag-1'), { beneficiaryId: 'ben-1', raisedBy: RP, status: 'open', reason: 'stuck' }))
    await assertFails(setDoc(doc(as(RP), 'adminFlags', 'flag-2'), { beneficiaryId: 'ben-2', raisedBy: RP, status: 'open', reason: 'stuck' }))
  })

  it("lets a trainer edit their centre's schedule but not its capacity", async () => {
    const centre = doc(as(RP), 'centres', 'centre-1')
    await assertSucceeds(updateDoc(centre, { schedule: { frequency: 'daily', startTime: '10:00', endTime: '12:00' } }))
    await assertFails(updateDoc(centre, { capacity: 60 }))
    await assertFails(updateDoc(doc(as(RP2), 'centres', 'centre-1'), { schedule: { frequency: 'weekly' } }))
  })

  it('lets a trainer mark attendance only for their own centre', async () => {
    await assertSucceeds(setDoc(doc(as(RP), 'attendance', 'att-1'), { centreId: 'centre-1', markedBy: RP, records: [] }))
    await assertFails(setDoc(doc(as(RP2), 'attendance', 'att-2'), { centreId: 'centre-1', markedBy: RP2, records: [] }))
  })
})

describe('admin-only data', () => {
  it('keeps follow-ups and gap data from executives and resource persons', async () => {
    for (const uid of [EXEC, RP]) {
      await assertFails(getDoc(doc(as(uid), 'followUps', 'fu-1')))
      await assertFails(getDoc(doc(as(uid), 'gapData', 'gap-1')))
    }
    await assertSucceeds(getDoc(doc(as(ADMIN), 'followUps', 'fu-1')))
    await assertSucceeds(getDoc(doc(as(ADMIN), 'gapData', 'gap-1')))
  })

  it('lets admins read any beneficiary', async () => {
    await assertSucceeds(getDoc(doc(as(ADMIN), 'beneficiaries', 'ben-2')))
  })

  it('keeps gap data from signed-out visitors, and lets only an admin seed it', async () => {
    // The Gap Map reads this collection, so who can read it is the privacy boundary.
    const signedOut = env.unauthenticatedContext().firestore() as unknown as Firestore
    await assertFails(getDoc(doc(signedOut, 'gapData', 'gap-1')))

    // Seeding writes as an admin through the client SDK — the rules are what make that safe.
    await assertSucceeds(
      setDoc(doc(as(ADMIN), 'gapData', 'gap-seeded'), { block: 'Ghaghra', demandCount: 60, gapType: 'no-centre' }),
    )
    for (const uid of [EXEC, RP]) {
      await assertFails(setDoc(doc(as(uid), 'gapData', 'gap-by-staff'), { block: 'Ghaghra' }))
    }
  })

  it('lets only an admin seed the beneficiaries collection', async () => {
    await assertSucceeds(
      setDoc(doc(as(ADMIN), 'beneficiaries', 'ben-seeded'), {
        name: 'Seeded Person',
        trainingStatus: 'new',
        employmentStatus: 'in-training',
        activeHandler: null,
        activeCallId: null,
      }),
    )
    await assertFails(setDoc(doc(as(EXEC), 'beneficiaries', 'ben-by-exec'), { name: 'Not allowed' }))
  })
})

/**
 * These exercise the queries the consoles actually run, not just single-document reads.
 * A rule can allow a document and still refuse the query that would reach it, so the
 * filters here are the same ones in firestoreData.ts.
 */
describe('the queries each console runs', () => {
  it('lets an executive read the waiting queue and their own calls, but not AI calls', async () => {
    const db = as(EXEC)
    await assertSucceeds(
      getDocs(query(collection(db, 'calls'), where('callType', '==', 'executive'), where('status', '==', 'waiting'))),
    )
    await assertSucceeds(
      getDocs(query(collection(db, 'calls'), where('callType', '==', 'executive'), where('handledBy', '==', EXEC))),
    )
    // Spec 7.1: AI calls are the admin's to see.
    await assertFails(getDoc(doc(db, 'calls', 'ai-1')))
    await assertFails(getDocs(query(collection(db, 'calls'), where('callType', '==', 'ai'))))
    // And another executive's completed call stays theirs.
    await assertFails(getDoc(doc(db, 'calls', 'done-by-exec2')))
  })

  it('lets a resource person read only the cases assigned to them', async () => {
    const db = as(RP)
    await assertSucceeds(
      getDocs(
        query(collection(db, 'calls'), where('callType', '==', 'resourcePerson'), where('assignedTo', '==', RP)),
      ),
    )
    await assertFails(
      getDocs(
        query(collection(db, 'calls'), where('callType', '==', 'resourcePerson'), where('assignedTo', '==', RP2)),
      ),
    )
  })

  it('lets a resource person read their own trainees, attendance and flags — and nobody else\'s', async () => {
    const db = as(RP)
    await assertSucceeds(
      getDocs(query(collection(db, 'beneficiaries'), where('assignedResourcePerson', '==', RP))),
    )
    await assertSucceeds(getDocs(query(collection(db, 'attendance'), where('markedBy', '==', RP))))
    await assertSucceeds(getDocs(query(collection(db, 'adminFlags'), where('raisedBy', '==', RP))))

    await assertFails(getDoc(doc(db, 'attendance', 'att-2')))
    await assertFails(getDoc(doc(db, 'adminFlags', 'flag-rp2')))
    await assertFails(getDocs(query(collection(db, 'attendance'), where('markedBy', '==', RP2))))
  })

  it('serves the Call Console its queue and its own reports, and refuses an unbounded queue read', async () => {
    const db = as(EXEC)
    // Exactly what loadExecutiveData() sends.
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'calls'),
          where('recordType', '==', 'queued'),
          where('callType', '==', 'executive'),
          where('status', '==', 'waiting'),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'calls'),
          where('recordType', '==', 'completed'),
          where('callType', '==', 'executive'),
          where('handledBy', '==', EXEC),
        ),
      ),
    )
    // A list is checked against the query, not the documents it would return: drop the
    // status filter and the rule can no longer tell this is the waiting queue.
    await assertFails(
      getDocs(
        query(collection(db, 'calls'), where('recordType', '==', 'queued'), where('callType', '==', 'executive')),
      ),
    )
    // The admin's overview rows are not the executive's to sweep up.
    await assertFails(getDocs(query(collection(db, 'calls'), where('recordType', '==', 'system'))))
  })

  it('serves the expert console only the cases addressed to that resource person', async () => {
    const db = as(RP)
    for (const recordType of ['queued', 'completed']) {
      await assertSucceeds(
        getDocs(
          query(
            collection(db, 'calls'),
            where('recordType', '==', recordType),
            where('callType', '==', 'resourcePerson'),
            where('assignedTo', '==', RP),
          ),
        ),
      )
      await assertFails(
        getDocs(
          query(
            collection(db, 'calls'),
            where('recordType', '==', recordType),
            where('callType', '==', 'resourcePerson'),
            where('assignedTo', '==', RP2),
          ),
        ),
      )
    }
  })

  it('lets any staff member read the course and centre reference data', async () => {
    for (const uid of [EXEC, RP]) {
      await assertSucceeds(getDocs(query(collection(as(uid), 'courses'))))
      await assertSucceeds(getDocs(query(collection(as(uid), 'centres'))))
    }
  })

  it('keeps follow-ups and every unfiltered collection scan from staff', async () => {
    const db = as(EXEC)
    await assertFails(getDocs(query(collection(db, 'followUps'))))
    await assertFails(getDocs(query(collection(db, 'beneficiaries'))))
    await assertFails(getDocs(query(collection(db, 'gapData'))))
    await assertFails(getDocs(query(collection(db, 'attendance'))))
  })

  it('lets the admin read every collection', async () => {
    const db = as(ADMIN)
    for (const path of [
      'beneficiaries',
      'calls',
      'followUps',
      'courses',
      'centres',
      'attendance',
      'adminFlags',
      'gapData',
    ]) {
      await assertSucceeds(getDocs(query(collection(db, path))))
    }
  })
})

/**
 * The writes each console makes. These are the exact shapes in src/data/actions.ts —
 * a rule that only ever gets tested against a hand-written document proves nothing about
 * the console that has to satisfy it.
 */
describe('the writes each console makes', () => {
  /* ── Admin ── */

  it('lets only an admin file, post and deactivate staff', async () => {
    const admin = as(ADMIN)
    await assertSucceeds(
      setDoc(doc(admin, 'staff', 'exec-new'), { role: 'executive', name: 'N. Toppo', active: true }),
    )
    await assertSucceeds(updateDoc(doc(admin, 'staff', 'exec-mahato'), { active: false }))
    await assertSucceeds(
      updateDoc(doc(admin, 'staff', 'rp-devi'), { centre: 'Angara Works Centre', courses: ['Welding L1'] }),
    )

    // An executive may read the directory but not edit it, and a role has to be real.
    await assertSucceeds(getDocs(query(collection(as(EXEC), 'staff'))))
    await assertFails(updateDoc(doc(as(EXEC), 'staff', 'exec-mahato'), { active: false }))
    await assertFails(updateDoc(doc(as(RP), 'staff', 'rp-devi'), { courses: ['Tailoring L2'] }))
    await assertFails(setDoc(doc(admin, 'staff', 'bad'), { role: 'superuser', name: 'X', active: true }))
    // Deactivate, never delete — the history has to survive (spec 6.2).
    await assertFails(deleteDoc(doc(admin, 'staff', 'exec-mahato')))
  })

  it('lets only an admin add courses and centres, and seat people at them', async () => {
    const admin = as(ADMIN)
    await assertSucceeds(setDoc(doc(admin, 'courses', 'solar-repair'), { course: 'Solar repair', nsqfLevel: 4 }))
    await assertSucceeds(
      setDoc(doc(admin, 'centres', 'centre-new'), { name: 'Bishunpur Centre', block: 'Bishunpur', capacity: 20 }),
    )
    // Allotment moves the seat count and the people it counts in one batch.
    const batch = writeBatch(admin)
    batch.update(doc(admin, 'centres', 'centre-1'), { allotted: 12, waiting: 3 })
    batch.update(doc(admin, 'beneficiaries', 'ben-1'), { centre: 'Ghaghra Training Centre', trainingStatus: 'enrolled' })
    await assertSucceeds(batch.commit())

    await assertFails(setDoc(doc(as(EXEC), 'courses', 'sneaky'), { course: 'Sneaky' }))
    await assertFails(setDoc(doc(as(RP), 'centres', 'sneaky'), { name: 'Sneaky' }))
  })

  it('lets an admin act on a flag without rewriting the trainer’s account of it', async () => {
    const admin = as(ADMIN)
    await assertSucceeds(
      updateDoc(doc(admin, 'adminFlags', 'flag-rp'), {
        status: 'assigned',
        assignedToId: 'officer-minz',
        assignedToName: 'K. Minz',
      }),
    )
    await assertSucceeds(updateDoc(doc(admin, 'adminFlags', 'flag-rp'), { status: 'resolved', actionNote: 'Visited.' }))
    // The reason, the note and the name on it are the trainer's words and stay as written,
    // even when the admin is closing the case.
    await assertFails(updateDoc(doc(admin, 'adminFlags', 'flag-rp'), { reason: 'something-else' }))
    await assertFails(updateDoc(doc(admin, 'adminFlags', 'flag-rp'), { note: 'Rewritten by the admin.' }))
    await assertFails(updateDoc(doc(admin, 'adminFlags', 'flag-rp'), { raisedBy: ADMIN }))
    await assertFails(updateDoc(doc(admin, 'adminFlags', 'flag-rp'), { status: 'invented' }))
    // Not the executive's to touch at all.
    await assertFails(updateDoc(doc(as(EXEC), 'adminFlags', 'flag-rp'), { status: 'resolved' }))
  })

  /* ── Resource person ── */

  it('lets a trainer mark attendance only at the centre they run', async () => {
    await assertSucceeds(
      setDoc(doc(as(RP), 'attendance', 'GH-L1-s5-ben-1'), {
        beneficiaryId: 'ben-1',
        centreId: 'centre-1',
        batchId: 'GH-L1',
        sessionNumber: 5,
        mark: 'present',
        markedBy: RP,
      }),
    )
    // Another trainer's centre, and another trainer's name on the row.
    await assertFails(
      setDoc(doc(as(RP2), 'attendance', 'GH-L1-s5-ben-1'), {
        beneficiaryId: 'ben-1',
        centreId: 'centre-1',
        sessionNumber: 5,
        mark: 'present',
        markedBy: RP2,
      }),
    )
    await assertFails(
      setDoc(doc(as(RP), 'attendance', 'forged'), {
        beneficiaryId: 'ben-1',
        centreId: 'centre-1',
        sessionNumber: 5,
        mark: 'present',
        markedBy: RP2,
      }),
    )
    await assertFails(updateDoc(doc(as(EXEC), 'attendance', 'att-1'), { mark: 'absent' }))
  })

  it('lets a trainer set status, recommendation and certificate for their own trainees only', async () => {
    await assertSucceeds(
      updateDoc(doc(as(RP), 'beneficiaries', 'ben-1'), {
        trainingStatus: 'certified',
        employmentStatus: 'unplaced',
        statusHistory: [{ status: 'certified', description: 'Passed the assessment.', whenLabel: '18 Sep' }],
        completionRecommendation: { nextCourse: 'Tailoring L2', jobRecommendation: 'SHG cluster' },
        certificateId: 'SETU-CERT-0001',
        certificateIssuedAt: '2026-09-18',
      }),
    )
    // Somebody else's trainee.
    await assertFails(updateDoc(doc(as(RP), 'beneficiaries', 'ben-2'), { trainingStatus: 'certified' }))
    // And not the fields that belong to the call, even on their own trainee.
    await assertFails(updateDoc(doc(as(RP), 'beneficiaries', 'ben-1'), { primaryNumber: '+91 00000 00000' }))
    // A certificate is never issued to somebody who is not certified.
    await assertFails(
      updateDoc(doc(as(RP), 'beneficiaries', 'ben-1'), { trainingStatus: 'attending', certificateId: 'SETU-CERT-9999' }),
    )
  })

  it('lets a trainer raise a flag on their own trainee, and nobody else’s', async () => {
    await assertSucceeds(
      setDoc(doc(as(RP), 'adminFlags', 'flag-new'), {
        beneficiaryId: 'ben-1',
        raisedBy: RP,
        status: 'open',
        reason: 'repeated-absence',
        note: 'Missed four sessions.',
      }),
    )
    await assertFails(
      setDoc(doc(as(RP), 'adminFlags', 'flag-forged'), {
        beneficiaryId: 'ben-2',
        raisedBy: RP,
        status: 'open',
        reason: 'repeated-absence',
      }),
    )
    // A trainer cannot close their own flag: that is the admin's call (spec 6.7).
    await assertFails(updateDoc(doc(as(RP), 'adminFlags', 'flag-rp'), { status: 'resolved' }))
  })

  it('lets a trainer set the schedule and materials of their own batch only', async () => {
    await assertSucceeds(
      updateDoc(doc(as(RP), 'batches', 'GH-L1'), {
        schedule: { days: [1, 3, 5], startTime: '10:00', endTime: '13:00', mode: 'in-person', location: 'Ghaghra' },
      }),
    )
    await assertSucceeds(
      updateDoc(doc(as(RP), 'batches', 'GH-L1'), {
        materials: [{ id: 'mat-1', title: 'Cutting guide', kind: 'document', body: 'https://drive.example/x' }],
      }),
    )
    await assertFails(updateDoc(doc(as(RP), 'batches', 'AN-L1'), { schedule: { days: [4] } }))
    // Not the batch's identity — only what the trainer runs day to day.
    await assertFails(updateDoc(doc(as(RP), 'batches', 'GH-L1'), { course: 'Something else' }))
    await assertFails(setDoc(doc(as(RP), 'batches', 'new-batch'), { course: 'Invented' }))
  })

  /* ── Call console ── */

  it('carries a call from accept through transfer to sent report, and releases the lock', async () => {
    const db = as(EXEC)
    await assertSucceeds(acceptCall(db, EXEC, 'queued-1', 'ben-1'))

    // Stage 2: correcting what the AI captured, while the call is active.
    // Every field the Active Call panel actually sends, not a convenient subset.
    await assertSucceeds(
      updateDoc(doc(db, 'beneficiaries', 'ben-1'), {
        name: 'Sunita Kumari',
        age: 29,
        gender: 'F',
        primaryNumber: '+91 94310 24718',
        secondaryNumber: null,
        district: 'Gumla',
        block: 'Ghaghra',
        village: 'Tetartoli',
        educationLevel: 'Class 8',
        currentWork: 'Daily wage',
        interests: ['tailoring'],
        updatedAt: serverTimestamp(),
      }),
    )
    // But not the trainer's fields, even mid-call.
    await assertFails(
      updateDoc(doc(db, 'beneficiaries', 'ben-1'), { trainingStatus: 'certified', updatedAt: serverTimestamp() }),
    )

    // A callback case handed to a resource person.
    await assertSucceeds(
      setDoc(doc(db, 'calls', 'queued-1-to-rp'), {
        recordType: 'queued',
        callType: 'resourcePerson',
        subType: 'course-related',
        status: 'waiting',
        handledBy: null,
        assignedTo: RP,
        beneficiaryId: 'ben-1',
        transferredFromCallId: 'queued-1',
      }),
    )

    // The report review is a state the call passes through, not just a modal.
    await assertSucceeds(
      updateDoc(doc(db, 'calls', 'queued-1'), { status: 'report-review', updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(updateDoc(doc(db, 'calls', 'queued-1'), { status: 'completed', updatedAt: serverTimestamp() }))
    // The report itself is a separate document, filed against the call it belongs to.
    await assertSucceeds(
      setDoc(doc(db, 'calls', 'queued-1-report'), {
        recordType: 'completed',
        callType: 'executive',
        status: 'completed',
        handledBy: EXEC,
        sourceCallId: 'queued-1',
        ref: 'CR-7912',
        discussion: 'Explained the fee position and enrolled her.',
      }),
    )
    // A call cannot skip the review: active straight to completed is refused.
    await assertFails(
      updateDoc(doc(db, 'calls', 'queued-2'), { status: 'completed', updatedAt: serverTimestamp() }),
    )
    // Sending the report hides identity again.
    await assertSucceeds(updateDoc(doc(db, 'beneficiaries', 'ben-1'), { activeHandler: null, activeCallId: null }))
    await assertFails(getDoc(doc(db, 'beneficiaries', 'ben-1')))
  })

  it('refuses a second executive the call, the lock and the edit', async () => {
    await acceptCall(as(EXEC), EXEC, 'queued-1', 'ben-1')
    await assertFails(acceptCall(as(EXEC2), EXEC2, 'queued-1', 'ben-1'))
    await assertFails(updateDoc(doc(as(EXEC2), 'beneficiaries', 'ben-1'), { name: 'Not theirs' }))
    // Nor file a report against a call they never handled.
    await assertFails(
      setDoc(doc(as(EXEC2), 'calls', 'stolen-report'), {
        recordType: 'completed',
        callType: 'executive',
        status: 'completed',
        handledBy: EXEC2,
        sourceCallId: 'queued-1',
      }),
    )
    // And a resource person cannot invent a case for themselves.
    await assertFails(
      setDoc(doc(as(RP), 'calls', 'self-dealt'), {
        callType: 'resourcePerson',
        subType: 'course-related',
        status: 'waiting',
        handledBy: null,
        assignedTo: RP,
        beneficiaryId: 'ben-1',
      }),
    )
  })

  /* ── AI demo call ── */

  it('lets the AI line file the caller it met and count a contested detection', async () => {
    const db = as(EXEC)
    await assertSucceeds(
      setDoc(doc(db, 'beneficiaries', 'SETU-JH-VOICE-1'), {
        name: 'Caller (name not given)',
        createdBy: 'ai-call',
        activeHandler: null,
        activeCallId: null,
        trainingStatus: 'new',
      }),
    )
    // Only as the AI line, and only cold — a record created already locked would hand the
    // creator an identity the privacy rule never granted them.
    await assertFails(setDoc(doc(db, 'beneficiaries', 'forged'), { name: 'X', createdBy: 'me' }))
    await assertFails(
      setDoc(doc(db, 'beneficiaries', 'forged-2'), { name: 'X', createdBy: 'ai-call', activeHandler: EXEC }),
    )

    // The dialect-gap counter: one step, nothing else touched.
    await assertSucceeds(updateDoc(doc(db, 'gapData', 'gap-1'), { contestedDetections: 1 }))
    await assertFails(updateDoc(doc(db, 'gapData', 'gap-1'), { contestedDetections: 50 }))
    await assertFails(updateDoc(doc(db, 'gapData', 'gap-1'), { contestedDetections: 1, demandCount: 9999 }))
    await assertFails(updateDoc(doc(db, 'gapData', 'gap-1'), { demandCount: 9999 }))
    // Counting is not reading: the analytics stay admin-only (spec 7.1).
    await assertFails(getDoc(doc(db, 'gapData', 'gap-1')))
  })
})
