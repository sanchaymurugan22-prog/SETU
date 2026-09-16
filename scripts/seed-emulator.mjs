// Seeds the LOCAL Auth + Firestore emulators with demo officials — one per case the
// router handles. Run by `npm run dev:emulator`; it never touches the real project.

const PROJECT_ID = 'demo-setu'
const AUTH_URL = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const FIRESTORE_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const PASSWORD = 'setu-demo-123'

const ACCOUNTS = [
  { email: 'admin@setu.test', name: 'R. Kulkarni', role: 'admin', isActive: true, languages: ['Hindi', 'English'] },
  { email: 'executive@setu.test', name: 'A. Mahato', role: 'executive', isActive: true, languages: ['Hindi', 'Kurukh'] },
  { email: 'trainer@setu.test', name: 'S. Devi', role: 'resourcePerson', isActive: true, languages: ['Hindi'] },
  { email: 'inactive@setu.test', name: 'P. Singh', role: 'executive', isActive: false, languages: ['Hindi'] },
  // Signed-in account with no users record.
  { email: 'norole@setu.test' },
]

async function post(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(`${url}: ${JSON.stringify(json)}`)
  return json
}

async function createAuthUser(email) {
  try {
    return (await post(`${AUTH_URL}/accounts:signUp?key=demo-key`, { email, password: PASSWORD })).localId
  } catch (error) {
    if (!String(error).includes('EMAIL_EXISTS')) throw error
    return (await post(`${AUTH_URL}/accounts:signInWithPassword?key=demo-key`, { email, password: PASSWORD })).localId
  }
}

async function writeUserDoc(uid, account) {
  const fields = {
    userId: { stringValue: uid },
    name: { stringValue: account.name },
    email: { stringValue: account.email },
    role: { stringValue: account.role },
    isActive: { booleanValue: account.isActive },
    languages: { arrayValue: { values: account.languages.map((stringValue) => ({ stringValue })) } },
    createdAt: { timestampValue: new Date().toISOString() },
  }
  // "Bearer owner" is the emulator's admin bypass for security rules.
  const response = await fetch(`${FIRESTORE_URL}/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) throw new Error(`users/${uid}: ${await response.text()}`)
}

for (const account of ACCOUNTS) {
  const uid = await createAuthUser(account.email)
  if (account.role) await writeUserDoc(uid, account)
}

console.log('\nEmulator seeded. Password for every account:', PASSWORD)
console.table(
  ACCOUNTS.map(({ email, role, isActive }) => ({
    email,
    role: role ?? '(no users record)',
    active: role ? isActive : '-',
  })),
)
