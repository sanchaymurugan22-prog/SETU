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
  batch.update(doc(db, 'calls', callId), { status: 'active', handledBy: uid, startedAt: serverTimestamp() })
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
      ['calls/rp-case-1', { callType: 'resourcePerson', subType: 'course-related', status: 'waiting', handledBy: null, assignedTo: RP, beneficiaryId: 'ben-1' }],

      ['courses/tailoring-l1', { courseName: 'Tailoring L1' }],
      ['centres/centre-1', { courseId: 'tailoring-l1', assignedResourcePerson: RP, capacity: 30 }],
      ['followUps/fu-1', { beneficiaryId: 'ben-1', purpose: 'did-you-enroll' }],
      ['gapData/gap-1', { demandCount: 60, gapType: 'no-centre' }],
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
})
