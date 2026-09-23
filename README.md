# SETU — Skill Empowerment Through Unified-voice

**सेतु** = *bridge*

A voice-first skilling assistant for SC beneficiaries under PM-AJAY (GIA). **Beneficiaries use only a phone call; officials use three role-based web consoles.**

**SIH 2026 · PS 26097 · Ministry of Social Justice and Empowerment · Team Cranial Remission (119449)**

**Live:** https://setu-india.web.app

---

## Try it now

**AI voice call — no login required:** https://setu-india.web.app/call

> Allow microphone access, or just type your replies — **the whole call also works by text.**

**Dialect-gap rehearsal:** https://setu-india.web.app/call?rehearse=contested
Forces the two language models to disagree, so the dialect-gap handoff can be seen on demand. The page says on screen that rehearsal mode is on.

**Demo logins** — sign in at https://setu-india.web.app/login

| Console | Email | Password | What to look at |
|---|---|---|---|
| **Admin** (sees everything) | `admin@setu.test` | `Admin@1234` | Opportunity Gap Map · Calls → AI Calls (Automation Funnel) · beneficiary journeys |
| **Call Executive** | `exec@setu.test` | `Exec@1234` | Waiting Calls → Accept → privacy lock → mandatory report |
| **Resource Person** | `rp@setu.test` | `Rp@1234` | Attendance · Certified → auto certificate · Milestones |

**Start with Admin.** All data is seeded sample data; demo accounts cannot delete records.

---

## The problem

- Portal-based skilling assumes **literacy, typing, a smartphone and internet** — the PM-AJAY target group has none of these. They are on keypad phones, speaking dialects, in villages with ~37% internet penetration.
- With no guidance, courses are chosen **blindly** — by rumour or by whatever is listed first — causing **mismatch and dropout**.
- Systems count **enrolments, not placements**, so nobody knows whether training ever led to a job.

---

## How SETU works

1. **The beneficiary calls** a toll-free number from any phone — no app, no internet, no reading.
2. **Bhashini ASR** converts their speech to text, using a model chosen per language.
3. **Dual-model language detection** runs on the first reply. If the two models **disagree**, the caller speaks something the stack cannot serve → **handed to a human**, and a **dialect gap is logged** against their block.
4. **A 16-stage deterministic dialogue** captures work, family trade, education, interest, travel and preference — then an **explainable NSQF matcher** filters on eligibility, free seats, travel radius, literacy and mobility, and says *why* it chose that course.
5. **A report goes out by SMS/WhatsApp**, everything is **saved to Firestore**, and the three consoles update — the call appears in the executive's queue and the block moves on the Gap Map.

<!-- ![Architecture](docs/architecture.png) -->

---

## Key features

- **Opportunity Gap Map** — a live Leaflet map of block-level gaps: *"60 people want tailoring here, no centre"* and *"40 trained welders here, no local jobs"*. Turns individual calls into **planning data telling the government where to invest next.**
- **Dialect-gap detection** — two Bhashini models are compared on every call, and **disagreement**, not a confidence score, is the signal. Measured against the live API, **Magahi speech was labelled Hindi at 0.92 by one model and Maithili at 0.98 by the other** — a confidence threshold would have passed it. *Caveat: measured on audio synthesised by Bhashini's own TTS, not real speech over a phone line; rates need re-measuring on genuine recordings before production.*
- **Voice-first, no app** — the beneficiary interface is a phone call. Nothing to install, read or type.
- **Closed-loop tracking** — **training status and employment status are kept as separate fields**, so *Certified* and *Unplaced* can be true at once. That pair is what the *trained-but-unplaced* metric counts.
- **Automation Funnel** — the share of calls closed by the AI with no human, over a 4-tier ladder: automated call → call executive → resource person → field officer.
- **Privacy lock enforced in Firestore rules** — beneficiary identity is readable only while an official holds an active call, not by the UI's choice but by the database's.

---

## The three consoles

| Role | What they see | What they can do |
|---|---|---|
| **Call Executive** | The waiting queue with **no beneficiary identity** (reason, wait, position, detected language) and **only their own** completed calls | Accept a call · edit what the AI captured, while the call is active · transfer a callback case to a resource person · review and send the mandatory report |
| **Resource Person** | **Only their own trainees** (full details — a trainer must know who they teach) and only their own expert calls | Mark attendance when the scheduled session opens · update training status with a required description · add completion recommendations · issue certificates · flag a case to the admin · edit schedule and course materials |
| **Admin** | **Everything** — all beneficiaries, staff, call types, courses and outcomes | Manage staff · add courses and centres with auto-allotment · act on flags and assign field officers · read the Opportunity Gap Map and the Automation Funnel |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Voice AI** | **Bhashini** (MeitY) — ASR, TTS, dual-model language detection |
| **Frontend** | React 19 · TypeScript · Vite |
| **Auth** | Firebase Auth (email/password, role from `users/{uid}`) |
| **Database** | Cloud Firestore — **asia-south1 (Mumbai)** |
| **Authorisation** | Firestore Security Rules |
| **Hosting** | Firebase Hosting |
| **Maps** | Leaflet + OpenStreetMap |
| **i18n** | react-i18next — 10 languages |
| **Tests** | Vitest + `@firebase/rules-unit-testing` |

---

## What is real vs simulated

| Component | Status |
|---|---|
| Bhashini ASR, TTS and language detection | **Real** — live API calls |
| Firebase Auth, Firestore and security rules | **Real** — enforced at the database |
| Every record in every console | **Real** Firestore documents, with a source badge on each section |
| Opportunity Gap Map | **Real** Leaflet map reading live `gapData` |
| Conversation logic and course matching | **Real** deterministic rules — no LLM, by design |
| **Telephony transport** | **Simulated** — browser microphone and speaker. The pipeline is identical to production; only the transport differs |
| **SMS / WhatsApp delivery** | **Simulated in-app** — the message is rendered exactly as the beneficiary would receive it |
| Staff directory | **Seeded**, and labelled as such on screen. Real login accounts live in `users`, untouched |
| Local file attachments on course materials | **Demo-only**, held in browser memory and labelled as not persisted |

**Production path:** Exotel / MSG91 for telephony and SMS (both Indian providers, keeping data in Indian jurisdiction), and NIC / MeghRaj government cloud.

---

## Security & privacy

- **Privacy lock** — accepting a call sets `activeHandler` on the beneficiary **in the same atomic batch** that claims the call; sending the report releases it. Identity is readable only while the lock is held and editable only while the call is `active`.
- **Enforced call lifecycle** — `waiting → active → report-review → completed`. A call **cannot skip the report review**; the database refuses `active → completed` directly.
- **No deletes anywhere** — every collection is `allow delete: if false`. Staff are deactivated, never removed, so history survives.
- **45 security-rules tests**, all passing, run against the Firestore emulator. They exercise the exact queries and writes the consoles make.

```bash
npm run test:rules
```

---

## Run locally

**Prerequisites:** Node.js 22 (developed on 22.14) · npm · a Firebase project · Bhashini ULCA credentials · Firebase CLI (for the emulator and deploys).

```bash
npm install
cp .env.example .env    # then fill in your own values
```

**Required `.env` variables** (names only — never commit values):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_BHASHINI_APP_ID
VITE_BHASHINI_UDYAT_KEY
VITE_BHASHINI_INFERENCE_KEY
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
```

**Scripts:**

| Command | What it does |
|---|---|
| `npm run dev` | Dev server against your real Firebase project |
| `npm run dev:emulator` | Dev server against local Auth + Firestore emulators, auto-seeded |
| `npm run build` | i18n completeness check → `tsc -b` → production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint |
| `npm run i18n:check` | Fails if any locale is missing a key English has |
| `npm run test:rules` | The 45 security-rules tests, against the emulator |
| `npm run test:bhashini` | Live tests against the Bhashini API |
| `npm run voice:build` | Pre-generates the fixed voice lines as audio (`public/voice/` is git-ignored, so run this after a fresh clone) |
| `npm run seed:firestore` | Seeds every collection in your real project — keyed by id, safe to re-run |
| `npm run seed:firestore:emulator` | The same seed against the local emulators |
| `npm run deploy:rules` | Deploys security rules and indexes |
| `npm run deploy:indexes` | Deploys composite indexes only |

---

## Documentation

- **[SETU-APP-GUIDE.md](SETU-APP-GUIDE.md)** — the complete application guide: every screen from splash to Gap Map, the data model, the security rules, and what is real vs simulated
- **[SETU-SPEC.md](SETU-SPEC.md)** — the full project specification: the problem, the solution, all three consoles, the data structure and the technology rationale
- **[SETU-CONVERSATION-SCRIPT.md](SETU-CONVERSATION-SCRIPT.md)** — the AI assistant's conversation, word for word: all 16 stages, 15 edge cases, and the eight rules it never breaks

---

## Team

**Cranial Remission · Team ID 119449**

Sanchay M · Harishmitha R · Balahariharan B · Giridhari Prakash D K · Kevin Patrick L · Sharmila N
