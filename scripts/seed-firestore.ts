/**
 * Writes the seeded Jharkhand sample into a real Firestore project.
 *
 * Run: npm run seed:firestore
 *
 * It signs in as an admin with the client SDK rather than using a service account,
 * because the Spark plan gives no admin credentials and the security rules already let
 * an admin write both collections. That also means this proves the rules work: if the
 * account is not an admin, the write is refused.
 *
 * Existing documents are overwritten by id, so running it twice is safe.
 */
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore'
import { sampleBlockGaps } from '../src/data/jharkhandGaps'
import { sampleBeneficiaries } from '../src/data/jharkhandBeneficiaries'
import {
  sampleAdminFlags,
  sampleCentres,
  sampleFollowUps,
  sampleStaff,
  sampleSystemCalls,
} from '../src/data/adminConsole'
import { sampleCourseRecords } from '../src/data/courseCatalogue'
import { RESOURCE_PERSON, sampleAttendance, sampleBatches } from '../src/data/resourcePerson'
import {
  sampleCompleted,
  sampleQueue,
  sampleResourcePersonCompleted,
  sampleResourcePersonQueue,
} from '../src/data/jharkhandCalls'

const env = process.env

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
]

const missing = required.filter((key) => !env[key]?.trim())
if (missing.length > 0) {
  console.error(`Missing: ${missing.join(', ')}`)
  console.error('Add SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to .env — the admin account you created in Firebase.')
  process.exit(1)
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY!,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
  projectId: env.VITE_FIREBASE_PROJECT_ID!,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID!,
})

const auth = getAuth(app)
const db = getFirestore(app)

// The web SDK ignores FIRESTORE_EMULATOR_HOST — unlike the Admin SDK — so the emulator
// has to be wired explicitly. This is how `npm run seed:firestore:emulator` rehearses
// the real run without touching the live project.
if (env.SEED_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  console.log('Using the local emulators.')
}

/** Firestore rejects undefined, and the sample has optional fields. */
function clean<T extends Record<string, unknown>>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Firestore batches cap at 500 writes. */
async function writeAll(path: string, rows: { id: string; data: Record<string, unknown> }[]): Promise<void> {
  for (let start = 0; start < rows.length; start += 400) {
    const batch = writeBatch(db)
    for (const row of rows.slice(start, start + 400)) {
      batch.set(doc(db, path, row.id), clean(row.data))
    }
    await batch.commit()
    process.stdout.write(`  ${path}: ${Math.min(start + 400, rows.length)}/${rows.length}\n`)
  }
}

/**
 * The rules filter by uid, not by name, so the seeded calls and trainees have to point at
 * the real accounts. The admin can read the staff directory, so the uids are looked up
 * rather than configured — one less thing to keep in step by hand.
 */
async function staffByRole(): Promise<Record<string, string[]>> {
  const snapshot = await getDocs(collection(db, 'users'))
  const byRole: Record<string, { uid: string; email: string }[]> = {
    admin: [],
    executive: [],
    resourcePerson: [],
  }
  for (const document of snapshot.docs) {
    const data = document.data() as { role?: string; email?: string; isActive?: boolean }
    // Deactivated accounts cannot sign in, so pointing seeded work at one would leave a
    // console with nothing to show. Sorting by email keeps the pick stable across runs —
    // document order is uid order, which is random.
    if (data.isActive === false) continue
    if (data.role && byRole[data.role]) byRole[data.role].push({ uid: document.id, email: data.email ?? '' })
  }
  const result: Record<string, string[]> = {}
  for (const [role, accounts] of Object.entries(byRole)) {
    result[role] = accounts.sort((a, b) => a.email.localeCompare(b.email)).map((account) => account.uid)
  }
  return result
}

async function main(): Promise<void> {
  console.log(`Project: ${env.VITE_FIREBASE_PROJECT_ID}`)
  await signInWithEmailAndPassword(auth, env.SEED_ADMIN_EMAIL!, env.SEED_ADMIN_PASSWORD!)
  console.log(`Signed in as ${env.SEED_ADMIN_EMAIL}`)

  const staff = await staffByRole()
  const executives = staff.executive!
  const trainerUid = staff.resourcePerson[0] ?? null
  const executiveUid = executives[0] ?? null
  console.log(
    `Active staff found — executives: ${executives.length}, resource persons: ${staff.resourcePerson.length}`,
  )
  if (!executiveUid || !trainerUid) {
    console.warn('No executive or resource-person account found: their calls will be admin-visible only.')
  }

  const seededAt = new Date().toISOString()
  const gaps = sampleBlockGaps()
  const beneficiaries = sampleBeneficiaries()
  const calls = sampleSystemCalls()
  const followUps = sampleFollowUps()
  const courses = sampleCourseRecords()
  const centres = sampleCentres()
  const attendance = sampleAttendance()
  const flags = sampleAdminFlags()
  const queue = sampleQueue()
  const completed = sampleCompleted()
  const rpQueue = sampleResourcePersonQueue()
  const rpCompleted = sampleResourcePersonCompleted()
  const staffDirectory = sampleStaff()
  const batches = sampleBatches()

  await writeAll(
    'gapData',
    // Seeded at zero: every contested detection on the map is one the demo produced.
    gaps.map((gap) => ({ id: gap.gapId, data: { ...gap, contestedDetections: 0, seededAt } })),
  )

  await writeAll(
    'beneficiaries',
    beneficiaries.map((person) => ({
      id: person.beneficiaryId,
      data: {
        ...person,
        // The console's privacy lock lives on these two fields; seed them explicitly.
        activeHandler: null,
        activeCallId: null,
        assignedResourcePerson: person.centre === RESOURCE_PERSON.batches[0]!.centre ? trainerUid : null,
        seededAt,
      },
    })),
  )

  // Spec 8.3: callType and status are what the rules and the console queries read, so
  // they are written as real fields beside the record rather than derived on the client.
  // One `calls` collection holds three kinds of document, told apart by recordType:
  //   'system'    — the admin's overview row for every call the platform has handled
  //   'queued'    — a call waiting in an official's console, status 'waiting'
  //   'completed' — the report an official sent after handling one
  // Each console queries its own kind, which is also what keeps the security rules simple:
  // callType and status are real fields beside the record, not something derived on the
  // client. Executive calls are dealt round-robin across the active executives, so every
  // account that can sign in has calls of its own rather than an empty console.
  let nextExecutive = 0
  const dealExecutive = () =>
    executives.length > 0 ? executives[nextExecutive++ % executives.length]! : null

  await writeAll('calls', [
    ...calls.map((call) => ({
      id: call.callId,
      data: {
        ...call,
        recordType: 'system',
        callType: call.handler,
        status: 'completed',
        handledBy: call.handler === 'executive' ? dealExecutive() : null,
        assignedTo: call.handler === 'resourcePerson' ? trainerUid : null,
        seededAt,
      },
    })),
    // A waiting call has no handler yet: the first executive to accept it takes it.
    ...queue.map((call) => ({
      id: call.callId,
      data: {
        ...call,
        recordType: 'queued',
        callType: 'executive',
        status: 'waiting',
        handledBy: null,
        assignedTo: null,
        seededAt,
      },
    })),
    ...completed.map((call) => ({
      id: call.callId,
      data: {
        ...call,
        recordType: 'completed',
        callType: 'executive',
        status: 'completed',
        handledBy: dealExecutive(),
        assignedTo: null,
        seededAt,
      },
    })),
    // Spec 7.2: a resource person's cases reach them by transfer, so they are addressed.
    ...rpQueue.map((call) => ({
      id: call.callId,
      data: {
        ...call,
        recordType: 'queued',
        callType: 'resourcePerson',
        status: 'waiting',
        handledBy: null,
        assignedTo: trainerUid,
        seededAt,
      },
    })),
    ...rpCompleted.map((call) => ({
      id: call.callId,
      data: {
        ...call,
        recordType: 'completed',
        callType: 'resourcePerson',
        status: 'completed',
        handledBy: trainerUid,
        assignedTo: trainerUid,
        seededAt,
      },
    })),
  ])

  await writeAll(
    'followUps',
    followUps.map((record) => ({ id: `fu-${record.beneficiaryId}`, data: { ...record, seededAt } })),
  )

  await writeAll(
    'courses',
    courses.map((course) => ({ id: course.course.replace(/[^\w]+/g, '-').toLowerCase(), data: { ...course, seededAt } })),
  )

  await writeAll(
    'centres',
    centres.map((centre) => ({
      id: centre.centreId,
      data: { ...centre, assignedResourcePerson: centre.resourcePersonId ? trainerUid : null, seededAt },
    })),
  )

  await writeAll(
    'attendance',
    attendance.map((record) => ({
      id: record.attendanceId,
      data: { ...record, markedBy: trainerUid ?? record.markedBy, seededAt },
    })),
  )

  await writeAll(
    'adminFlags',
    flags.map((flag) => ({
      id: flag.flagId,
      data: {
        ...flag,
        // raisedBy is a uid for the rules; the display name travels beside it.
        raisedByName: flag.raisedBy,
        raisedBy: trainerUid ?? flag.raisedBy,
        seededAt,
      },
    })),
  )

  const callDocs = calls.length + queue.length + completed.length + rpQueue.length + rpCompleted.length
  // The staff directory the Admin console edits. Deliberately not `users`: those are real
  // sign-in accounts and the seeder never touches them.
  await writeAll(
    'staff',
    staffDirectory.map((person, index) => ({
      id: person.userId,
      data: {
        ...person,
        // The sign-in account behind the entry, where there is one: the rules address a
        // transfer target by uid, so a directory id alone cannot receive a case.
        uid:
          person.role === 'resourcePerson'
            ? (staff.resourcePerson[index % Math.max(1, staff.resourcePerson.length)] ?? null)
            : (executives[index % Math.max(1, executives.length)] ?? null),
        seededAt,
      },
    })),
  )

  // The trainer's batches: schedule and materials, both editable from the console.
  await writeAll(
    'batches',
    batches.map((batch) => ({
      id: batch.batchId,
      data: { ...batch, assignedResourcePerson: trainerUid, seededAt },
    })),
  )

  console.log(
    `\nDone. ${gaps.length} gaps · ${beneficiaries.length} beneficiaries · ${callDocs} calls ` +
      `(${calls.length} overview, ${queue.length + rpQueue.length} waiting, ` +
      `${completed.length + rpCompleted.length} reports) · ` +
      `${followUps.length} follow-ups · ${courses.length} courses · ${centres.length} centres · ` +
      `${attendance.length} attendance rows · ${flags.length} flags · ` +
      `${staffDirectory.length} staff · ${batches.length} batches.`,
  )
  console.log('Every write is keyed by id, so running this again overwrites rather than duplicates.')
  console.log('Open the consoles — each section badge should read "Firestore".')
  process.exit(0)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nFailed: ${message}`)
  if (message.includes('permission')) {
    console.error('The signed-in account is not an admin in users/{uid}, so the rules refused the write.')
  }
  process.exit(1)
})
