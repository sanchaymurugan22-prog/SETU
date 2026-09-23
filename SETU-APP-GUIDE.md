# SETU — The Complete Application Guide

**Skill Empowerment Through Unified-voice**

| | |
|---|---|
| **Event** | Smart India Hackathon 2026 |
| **Problem Statement** | **26097** — AI-Driven Voice Assistant for Livelihood Mapping and NSQF-Aligned Skilling Recommendations for SC Communities under the GIA component of PM-AJAY |
| **Ministry** | Ministry of Social Justice and Empowerment (MoSJE) |
| **Theme / Category** | Agriculture, FoodTech & Rural Development / Software |
| **Team** | Cranial Remission · Team ID 119449 |
| **Live** | https://setu-india.web.app |
| **Repository** | https://github.com/sanchaymurugan22-prog/SETU |

> This document explains **the application** — every screen, in the order a person meets them, and what each one actually does. For the problem statement, the scheme background and the pitch, see `SETU-SPEC.md`. For the AI assistant's word-for-word conversation, see `SETU-CONVERSATION-SCRIPT.md`.

---

## Table of Contents

1. [The one-paragraph version](#1--the-one-paragraph-version)
2. [The single most important idea in the whole project](#2--the-single-most-important-idea-in-the-whole-project)
3. [The startup sequence — splash → language → login](#3--the-startup-sequence--splash--language--login)
4. [Who can log in, and what each person gets](#4--who-can-log-in-and-what-each-person-gets)
5. [Console 1 — The Call Console](#5--console-1--the-call-console-call-executive)
6. [Console 2 — The Resource Person Console](#6--console-2--the-resource-person-console)
7. [Console 3 — The Admin Console](#7--console-3--the-admin-console)
8. [The Opportunity Gap Map, in depth](#8--the-opportunity-gap-map-in-depth)
9. [The dialect gap — our most important finding](#9--the-dialect-gap--our-most-important-finding)
10. [The AI voice call, stage by stage](#10--the-ai-voice-call-stage-by-stage)
11. [Bhashini — exactly how we use it](#11--bhashini--exactly-how-we-use-it)
12. [The data — every Firestore collection](#12--the-data--every-firestore-collection)
13. [Security rules — privacy as code](#13--security-rules--privacy-as-code)
14. [How the app talks to the database](#14--how-the-app-talks-to-the-database)
15. [The technology stack](#15--the-technology-stack)
16. [Languages and translation](#16--languages-and-translation)
17. [Running, seeding and testing the project](#17--running-seeding-and-testing-the-project)
18. [The demo path](#18--the-demo-path)
19. [What is real, what is simulated](#19--what-is-real-what-is-simulated)
20. [The feature ranking — what matters most](#20--the-feature-ranking--what-matters-most)

---

## 1 · The one-paragraph version

A person in a village dials a toll-free number on a basic keypad phone. An AI voice assistant answers in Hindi and English, works out which language they actually speak, and has a real conversation with them — what work do you do, what did your family do, how far can you travel, can you read. From that conversation it recommends an **NSQF-aligned course** at a **real training centre near them** with **seats actually free**. If it cannot understand them, or they ask something it does not know, it hands the call to a human. Everything that happens on that call is written to a database. Three groups of government officials then work from that database through **three role-based web consoles**: a **Call Executive** who takes escalated calls, a **Resource Person** who teaches the course and answers expert questions, and an **Admin** who sees everything — including the **Opportunity Gap Map**, which turns thousands of individual calls into a block-by-block picture of where the government should build the next training centre.

**The beneficiary never touches the web application.** They only ever make and receive phone calls. The three consoles exist entirely for the officials.

---

## 2 · The single most important idea in the whole project

Every other team at this hackathon will build a portal, an app, or a chatbot. All of them require the user to **read, type, own a smartphone, and have internet**.

The people this problem statement is about have **none of those things**. They are low-literacy, on 2G keypad phones, speaking a dialect, in a village with 37% internet penetration.

> **So every app-based solution rebuilds the exact barrier the problem asks them to remove.**

SETU's answer is that the beneficiary interface is a **phone call**. Nothing else. That one decision is what makes SETU able to answer the question *"can an illiterate farmer with a keypad phone actually use this?"* — and it is the reason the three consoles in this application are built for officials only.

---

## 3 · The startup sequence — splash → language → login

This is the exact order a person meets the app, and each step exists for a reason.

### Step 1 — The splash screen

**File:** `src/pages/SplashScreen.tsx`

When the app first loads you see a full-screen brand moment:

- The **SETU mark** (the bridge logo), 140px
- The wordmark **SETU**, and below it **सेतु** in Devanagari — the name means *bridge* in Hindi and Sanskrit
- A divider, the tagline, and a three-dot loading indicator
- Ministry of Social Justice and Empowerment branding

**How it behaves:**

- It holds for exactly **3 seconds** (`SPLASH_VISIBLE_MS`), then fades out over **450ms** (`SPLASH_FADE_MS`).
- The real app **boots underneath it**, so the splash costs nothing — by the time it fades, Firebase Auth has already resolved whether someone is signed in.
- The same component is reused as a **loading state**. Any time the app is waiting to find out who you are (`state.status === 'loading'`), you see the splash rather than a blank screen or a flash of the login form.
- **After sign-out, the splash replays.** `SplashGate` exposes `replay()`, and signing out calls it. The next person at that machine gets the full opening again: splash → language → login. This matters because these are **shared government machines** — one official signs out, the next signs in, and the app should not leave the previous person's session state visible.

### Step 2 — The language selection screen

**File:** `src/pages/LanguageScreen.tsx` · **Route:** `/language`

A full screen offering **ten Indian languages**, each shown in **its own native script** with the correct font loaded:

| | | | | |
|---|---|---|---|---|
| हिन्दी Hindi | English | தமிழ் Tamil | తెలుగు Telugu | বাংলা Bengali |
| मराठी Marathi | ગુજરાતી Gujarati | ಕನ್ನಡ Kannada | മലയാളം Malayalam | ଓଡ଼ିଆ Odia |

You pick one and press **Continue**, which confirms the choice and routes you to `/login`.

**Three rules govern this screen, and they are deliberate:**

1. **It only appears when nobody is signed in.** If you are already signed in, the screen redirects straight to your console (`if (state.status === 'ready') return <Navigate to={homePathFor(state.staff.role)} />`). An official who is working does not get interrupted by a language chooser.
2. **It appears before the login form, not after.** An official who reads only Odia should be able to read the sign-in form itself. Choosing the language after signing in would be too late.
3. **The app always starts in English regardless of what was chosen last time** (`DEFAULT_UI_LANGUAGE = languageFor('en')`). On a shared machine, the previous person's language choice should not confuse the next person. The choice applies to the session, not permanently.

> **The most common misunderstanding about this screen:** *this is the language the **official** reads the console in. It has nothing to do with what language SETU speaks to a beneficiary.* The beneficiary's language is **never chosen by anyone** — it is **detected from their own speech** during the call, and may well be a dialect outside these ten. See [section 9](#9--the-dialect-gap--our-most-important-finding). This separation is written into the code as a comment in `src/lib/languages.ts` so nobody later confuses the two.

### Step 3 — The login page

**File:** `src/pages/LoginPage.tsx` · **Route:** `/login`

A two-panel screen. On the left, a dark brand panel: the SETU mark, the pitch, and the Ministry line with the national emblem. On the right, the sign-in form:

- **Official email** and **password**
- A **show/hide** toggle on the password
- **Keep me signed in** — a checkbox that switches Firebase persistence between `browserLocalPersistence` (survives closing the browser) and `browserSessionPersistence` (cleared when the tab closes). Defaults to **off**, which is the right default for a shared government machine.
- **Forgot password** — sends a Firebase password-reset email
- A note explaining that you are routed automatically to the right console

**Error handling is translated, not raw.** Firebase error codes are mapped to human sentences (`authErrorKey()`): a wrong password becomes *"those sign-in details did not match"*, a disabled account says so, too many attempts says so, and a network failure says so. The raw code is appended only as a fallback, so a genuine problem is still debuggable.

**What happens on success:** `AuthProvider` sees the new user, reads their `users/{uid}` document to get their **role** and **isActive** flag, and the login page redirects. Deep links are honoured **only inside your own console** — if you were sent to `/admin/gap-map` before signing in, you land there; if the remembered page belongs to a different role, you go to your own console home instead. That is a deliberate guard: after a sign-out the remembered page belongs to the **previous user**.

### The full routing map

```
 App loads
    │
    ▼
 ┌─────────┐   3s hold, 450ms fade
 │ SPLASH  │   (also shown whenever auth is resolving)
 └────┬────┘
      │
      ├── already signed in? ──────────────► straight to your console
      │
      ▼  nobody signed in
 ┌──────────────┐
 │  /language   │  ten languages, native scripts
 └──────┬───────┘
        │ Continue
        ▼
 ┌──────────────┐
 │   /login     │  Firebase Auth email + password
 └──────┬───────┘
        │ role read from users/{uid}
        ├── admin ──────────► /admin
        ├── executive ──────► /executive
        ├── resourcePerson ─► /resource-person
        └── no role / deactivated ─► /  (AccessProblemPage explains why)

 Separate, no sign-in:  /call  — the beneficiary's own voice call
```

**Sign out** → splash replays → language → login. The full cycle, every time.

---

## 4 · Who can log in, and what each person gets

There are exactly **three roles**, stored in Firestore at `users/{uid}.role`. The document ID **is** the Firebase Auth UID — there are no custom claims, because custom claims need a server and SETU runs on Firebase's free Spark plan.

| Role | Console | Lands on | Sees | Cannot see |
|---|---|---|---|---|
| `executive` | **Call Console** | Waiting Calls | The waiting queue (no identity) and **only their own** completed calls | Other executives' calls · AI calls · the Gap Map · beneficiary lists |
| `resourcePerson` | **Resource Person Console** | Beneficiaries | **Only their own trainees**, their own expert calls, their own batches | Other trainers' trainees and calls · AI calls · the Gap Map |
| `admin` | **Admin Console** | Beneficiaries | **Everything** — all beneficiaries, all staff, all call types, all courses, all outcomes, the Gap Map | — |

**Two failure states are handled explicitly rather than crashing:**

- **A signed-in user with no `users/{uid}` document** (someone created in Auth but never given a role) sees the **Access Problem** page, which explains that their account has not been set up and who to contact.
- **A deactivated account** (`isActive: false`) sees the same page. The rules also refuse them at the database level — `isStaff()` checks `isActive == true` before anything else — so a deactivated official cannot read data even with a valid session.

**Wrong-console protection:** if an executive types `/admin/gap-map` into the address bar, `RequireRole` sends them to their own console rather than showing an error. Combined with the Firestore rules, an unauthorised read is refused twice — once in the UI and once at the database.

---

## 5 · Console 1 — The Call Console (Call Executive)

**Who:** call-centre staff. **Purpose:** take the calls the AI could not finish, correct what the AI got wrong, and file a report.

**Sidebar:** `Sections → Waiting Calls · Completed Calls` and `Demo → AI Demo Call`.

### 5.1 Waiting Calls — the entire call flow in three stages

This is the main working screen and it moves through three stages in sequence.

#### Stage 1 — The Queue

A live list of calls waiting for a human. Each row shows **only non-identifying information**:

- **Queue position** (01, 02, 03…) — always the true position, independent of how you have sorted the list
- **Reason for transfer to human** — one of six tags, each with a live count: *AI low confidence · Beneficiary requested human · Course question · Placement · Self-employment guidance · Follow-up, unable to manage*
- **Waiting time**, ticking up in real time, with an **"Over 5 min target"** warning once a call passes `WAIT_TARGET_SECONDS`
- **Detected language and block** — e.g. *"Hindi · 0.83 · Hindi ↔ Maithili · Gumla, Ghaghra"*. The second pair is shown when the two detection models disagreed.

**No name. No phone number. No village.** This is the privacy rule working: an executive choosing which call to take has no business knowing who is on the other end.

**Controls:** filter by reason tag, filter by sub-type, sort by longest wait or by queue position, and an **availability toggle** (*Available for calls*).

**The only action is Accept.** There is deliberately **no decline button** — an executive cannot cherry-pick and leave a difficult caller waiting.

#### Stage 2 — Active Call

The moment you accept, **and only then**, the beneficiary's identity appears.

- Everything the AI captured is **pre-filled**: name, age, gender, district, block, village, education level, current work, interests, constraints, primary number, secondary number, consent status
- The AI's own context panel: what it discussed, what it recommended, its confidence, the transcript, and any prior flags
- A **live call timer**, with **Hold** and **Add note**

**The executive can edit every field.** This is the point of the stage — the AI mishears names, gets a village wrong, and captures a phone number with a digit missing. The executive fixes it **while talking to the person who can confirm it.** Each field saves when you leave it, so one correction is one database write rather than one per keystroke.

**Transfer to a Resource Person** is available here — as a **callback case**, not a live transfer. You pick a reason: *Course question · Person-specific · Dissatisfaction*. A course question becomes a `course-related` case; the other two become `common-related`.

**The editing window closes the instant the call ends.** That is not a UI convenience — it is enforced in the Firestore rules, which permit an edit only while the call document's status is `active` and only for the official holding the privacy lock.

#### Stage 3 — Report Review (mandatory, cannot be skipped)

A modal opens with the AI-generated report: what was discussed, the course recommended, the actions taken, the outcome. The executive reads it, **edits anything the AI got wrong**, and presses **Send**.

On Send, in a single atomic batch:

1. The report is saved as its own document
2. The call is marked `completed`
3. **The privacy lock is released** — the beneficiary's identity becomes invisible again
4. The call moves to Completed Calls

In production the report also goes to the beneficiary by **SMS and WhatsApp** (primary number always, secondary where available). In this build that delivery is rendered in-app exactly as the beneficiary would receive it.

> No call can end without a report. The stage is modal and the database enforces the lifecycle: a call cannot jump from `active` to `completed` without passing through `report-review`. The review being mandatory in the UI would be meaningless if the data allowed it to be skipped.

### 5.2 Completed Calls

**Only the calls this executive personally handled.** Not other executives' calls, and never AI calls.

Each entry shows the report content only — discussion, course, actions, outcome, duration, the detected language, and a reference number. **Identity is hidden again.** Searchable and filterable by period, outcome and sub-type.

### 5.3 AI Demo Call

The beneficiary's own call experience, embedded in the console so it can be shown on a screen during a demo. Full detail in [section 10](#10--the-ai-voice-call-stage-by-stage).

The section carries a line stating plainly that **in production the beneficiary reaches SETU by phone on the toll-free number and never sees this interface** — it exists so the call can be demonstrated.

A call placed here is real: it appears in the executive's Completed Calls, or joins the waiting queue if it escalates, and its block feeds the Gap Map.

---

## 6 · Console 2 — The Resource Person Console

**Who:** the resource person, who wears **two hats** — **Trainer** (delivers the course) and **Expert** (answers escalated skilling questions).

**Sidebar:** `Trainer → Beneficiaries · Course Materials · Sessions` and `Expert → Waiting Calls · Completed Calls · Milestones`.

### 6.1 Beneficiaries *(Trainer hat)*

Every trainee enrolled in this resource person's course(s), with **full details visible** — this is the one deliberate exception to the privacy rule, because *a trainer must know who they are teaching.*

Per trainee: name, beneficiary ID, village, batch, course, attendance (e.g. `19 / 24`), last contact, **training status** and **employment status** as two separate columns.

**Why two status columns instead of one:** a trainee can be **Certified** and **Unplaced at the same time**. That pair is the single most important fact in the entire project — it is exactly what the scheme's documented core failure looks like, and it is what the Gap Map's *trained-but-unplaced* count is built from. Collapsing them into one column would hide it.

- **Training status:** `Enrolled → Attending → Irregular → Certified → Dropped`
- **Employment status:** `In training · Seeking work · Placed · Unplaced · Not tracked`

There is **no separate "Completed" stage**. Finishing the course is what issues the certificate, so **Certified means finished and certificate issued** — one stage, not two that can drift apart.

**What the trainer can do:**

- **Mark attendance** — Present/Absent per person. The button is inactive and reads *"Opens at session time"* until a scheduled session actually begins. **The schedule decides, not the trainer** — a clock ticks every 15 seconds and the sheet opens on its own when the scheduled window arrives. Each tick is saved as its own attendance record the moment it is made, because a trainer marking a register gets interrupted, and a sheet that only saves on a button nobody pressed is a session that never happened.
- **Update training status** — with a **mandatory description**. The trainer cannot record *"Dropped"* without writing why. That description is the dropout-reason capture; no separate field is needed, and the reason feeds the matching engine.
- **Add completion recommendations** once Certified — **both** a next upskilling course *and* a job recommendation.
- **Flag to Admin** — for a stuck case. Pick a reason (*repeated absence · travel cost · family pressure · no local work · needs a field visit*) and write a note. It lands in the Admin Console's Admin Flags section with the trainee's record attached.

**Automatic behaviour:** setting status to **Certified** generates and issues the certificate in the **same write**. They are one act, so they cannot half-fail — a certificate with no status behind it is worse than neither. The database rules enforce this too: a certificate can only ever be attached to a record whose training status is `certified`.

### 6.2 Course Materials

Everything about running the course:

- **Schedule and timings** — day chips (Sun–Sat), start and end time, mode (**In person / Online / Hybrid**), location, and an online meeting link. **This schedule is what drives when attendance sheets open**, so editing it here changes the Beneficiaries screen.
- **Course materials** in three kinds:
  - **Text** — a written note for trainees
  - **Link** — a URL to anything hosted
  - **Document** — PDF, DOC, PPT, spreadsheet, with the file type, name and size shown

**A deliberate constraint, stated honestly:** Firebase Storage requires the paid Blaze plan and this project is on the free Spark plan, so **real file storage is not available**. The primary path is therefore a **document link** (Google Drive, DigiLocker, or any hosted URL) with a file-type label — which is also how a real deployment would work, since these documents already live in government systems. A local file can also be attached **for demonstration only**; it is held in browser memory, **labelled clearly as demo-only and not persisted**, and is gone on reload. Only the links are saved to the database.

### 6.3 Sessions

Every session this trainer has actually taken, newest first, **derived from the same attendance records** the Beneficiaries screen writes — which is why the two can never disagree.

**Overall summary:**

- **Trainees** on the register
- **Overall attendance %** — e.g. *"90% · 225 present of 251 marks"*
- **Attendance falling** — trainees below the 75% watch level **who are still training** (someone who has finished or left is not "falling behind")

**Per session:** date, time window, batch and course, session number, present count, absent count, attendance percentage — and the **per-person register** behind it. The session currently being marked is shown live, labelled **"Being marked now"**.

### 6.4 Waiting Calls *(Expert hat)*

The same queue → accept → active call → report review → send flow as the Call Console, but for **expert escalations**, split in two:

- **Course-related** — trade-specific questions: what will I learn, what tools, what work afterwards, wrong course fit
- **Common-related** — general guidance: career decisions, placement problems, self-employment, dissatisfaction, repeated dropout

**Cases arrive here only via the Call Console — never directly.** That is the routing rule, and the security rules enforce it: a resource person cannot create a case for themselves. A case can only be created by an executive, out of their own active call, addressed to a resource person who genuinely has an active account.

### 6.5 Completed Calls *(Expert hat)*

This resource person's own completed expert calls, split into the same two parts. Reports only — **identity hidden**.

### 6.6 Milestones

The trainees this resource person trained through to **successful completion** — their achievement record.

Per trainee: course, batch, sessions attended, training and employment status, and the **certificate ID**.

**The printable certificate.** Each record opens a full certificate sheet, built to print properly:

- The **SETU logo** and the **official seal** from the brand sheet
- **Ministry of Social Justice and Empowerment · Government of India**
- Trainee name · course name and **NSQF level** · training centre with block and district
- Start and completion dates · **certificate ID** · issue date
- Trainer name and designation · a verification note

Labels are translated; names, IDs and dates are data.

---

## 7 · Console 3 — The Admin Console

**Who:** officials and administrators. **Purpose:** complete oversight, plus the planning instruments that make SETU more than an app.

**Eight sections.**

### 7.1 Beneficiaries

Every beneficiary in the system with **full details** — the admin is the only role that sees everyone.

- Search and filter by district, block, course, training status, employment status
- A dedicated filter for **AI-flagged or stalled** beneficiaries — the people who dropped off, stopped responding, or are stuck
- **Open any beneficiary's full journey**: profile → every call → recommendation → enrolment → attendance → completion → placement, end to end, in one timeline

This is the closed-loop tracking the scheme currently lacks. Most systems count enrolments; this one can answer *"did this specific person get a job?"*

### 7.2 Call Executives

The directory of call-centre staff: name, official email, district, joined date, **calls handled**, reports sent, transfers out, average handle time, last active, and an Active/Deactivated chip.

**Add a new call executive** (name, email, district) and **deactivate** — never delete, so history survives (a deactivated official keeps their completed calls attached to them).

### 7.3 Resource Persons

The directory of trainers: name, email, **posting** (centre, block, district), **courses they teach**, trainee count, certified count, calls handled.

**Add a resource person**, **assign them to a centre**, and **toggle which courses they teach**. Assigning a trainer to a centre also records the assignment **on the centre**, because that is what the attendance rules read to decide whether this trainer may mark a sheet there.

> **An honest note shown in both staff sections:** the staff directory is **seeded for the demonstration** — the postings and activity figures are sample records. The real sign-in accounts live in the `users` collection, which the seeder never writes to. Creating a login account for somebody else needs a server, and SETU runs on Spark, so "Add a call executive" files the **directory record** an admin would file, and the account itself is issued separately.

### 7.4 Calls — three parts plus the Automation Funnel

Every call in the system, in three tabs:

- **Part A — Executive Calls** — all calls handled by call executives, with reports
- **Part B — Resource Person Calls** — all expert calls, course-related and common-related
- **Part C — AI Calls** — every call the AI handled, each showing the AI report, the **outcome** (`fully-handled · escalated · follow-up · failed`), the **escalation reason**, and the **confidence score**

**The Automation Funnel lives inside AI Calls.** It states, as one number: *"X% of calls were closed by the AI without a human ever joining."*

That single figure is **the scalability proof**. The scheme covers millions of people and the government does not have an army of call-centre staff. The funnel answers the question *"does this actually work at national scale?"* — which most competing teams cannot answer at all.

### 7.5 Follow-up Reports

The **automated follow-up engine's** activity, per beneficiary: how many follow-up calls were made, **what each was for**, and how it went.

- **Purposes:** `did-you-enroll · are-you-attending · any-problem · did-you-get-placed · re-engagement`
- **Outcomes:** `answered · no-answer · problem-found · escalated`

This is the machinery that lets SETU scale — three tiers, where **most follow-ups end at tier 1 with no human involved**:

```
Tier 1  Automated AI call      — did you enrol? are you attending? any problem?
Tier 2  Call executive         — only when a problem, confusion or question is found
Tier 3  Resource person        — only for genuine skilling issues
Tier 4  Field officer          — only for an on-ground visit
```

### 7.6 Courses & Centres

Three tabs.

- **Courses** — every course with its NSQF level, how many centres run it, and **enrolled / allotted / waiting** counts
- **Centres** — every training centre with district, block, courses offered, **seats used out of capacity**, and the assigned resource person
- **Waiting for allotment** — blocks where a course is wanted and **no centre serves it**, ranked by demand, with the distance to the nearest centre

**Add a course** and **add a centre**, plus the spec's **auto-allotment rule**: when you open a new centre in a block that has people waiting, **the waiting list is absorbed into it automatically**, up to capacity, with a resource person attached. The seat count and the people it counts move in **one atomic write** — a seat count that moved without the people behind it would be a number with nothing behind it.

> A course added here is created **without an earning figure**. That is deliberate and it is the same rule the AI assistant follows: *never invent a fee or an earning figure*. A course filed without one has none until somebody who knows fills it in.

### 7.7 Admin Flags

Every case a resource person flagged, with the trainee's record, the reason, the trainer's note, when it was raised, and its status (**Open / Assigned / Resolved**) with live counts.

**The admin can:**

- **Assign a field officer** — choosing from block welfare officers, district social welfare officers, placement coordinators and field counsellors — with a **written instruction** (minimum length enforced, so "assigned" always carries an actual instruction)
- **Mark resolved**

> **A protection built into the database:** an admin can set the status, assign an officer and add an action note — but **cannot edit the reason, the note, or the name on the flag.** Those are the trainer's account of what happened, and an administrator closing a case must not be able to rewrite the report that raised it.

### 7.8 Opportunity Gap Map ⭐

SETU's signature feature — see the next section.

---

## 8 · The Opportunity Gap Map, in depth

> **If a judge remembers one screen from this project, it should be this one.**

Every other team's solution helps **individuals**. This screen also tells the **government where to invest next**. It is what reframes SETU from *an app* into *a governance instrument*.

### What it is

A live **Leaflet + OpenStreetMap** map of Jharkhand, with a marker on every block where SETU has found a gap. **Marker size scales with the number of people affected**, so the biggest problems are visibly the biggest dots.

### The two kinds of gap

| Gap type | What it means | Example |
|---|---|---|
| **`no-centre`** | Demand exists here, but there is **no training centre** for it | *"60 people in this block want tailoring. There is no centre. The nearest is 52 km away."* |
| **`no-local-jobs`** | People were **trained here, but there is no local work** | *"40 trained welders in this block. No local jobs."* |

Each marker is graded **high / medium / low severity**, carries how long the gap has been flagged, and opens a panel with the full detail and a **recommended action**.

**Filters:** by jurisdiction (district), by time window, and by gap type.

### The summary analytics

Six cards across the top:

| Card | What it answers |
|---|---|
| **Enrollment rate** | Of everyone who called, how many actually enrolled |
| **Completion rate** | How many finished their course |
| **Placement rate** | How many got work — measured against the **state target**, and flagged when below it |
| **Trained, unplaced** | Completed minus placed. **The accountability number** — the scheme's documented core failure, counted |
| **Course demand** | The trades most requested in flagged blocks — direct planning data |
| **Contested detections** | The dialect gap — see [section 9](#9--the-dialect-gap--our-most-important-finding) |

### Why this wins

The scheme's own documentation lists *"no proper roadmap from planning to execution"* and *"no job placement after training"* as core failures. This screen attacks both directly:

- It tells a planner **exactly which block needs the next centre**, with the demand figure to justify it
- It tells them **which blocks are producing trained people with nowhere to work**, so training is not poured into a place with no employment
- It feeds **GIA's Annual Action Plan** with real numbers instead of siloed reporting

And crucially: **every marker is built from real beneficiary calls.** It is not a separate data-entry exercise. The map is a by-product of helping individuals — which is exactly why it scales.

---

## 9 · The dialect gap — our most important finding

This is the part of the project that could not have been faked, and it came from **testing India's own language infrastructure against real API calls.**

### The problem

A Kurukh speaker calls SETU. Kurukh is a Dravidian language spoken across Jharkhand by over a million people. **Bhashini does not support it.** Neither does it support Magahi, or several other languages spoken by exactly the population this scheme targets.

The obvious engineering answer is: *use a confidence score. If the model is unsure, escalate to a human.*

### Why that obvious answer is wrong

We tested it against the live Bhashini API. **An unsupported language does not come back unsure. It comes back WRONG AND CONFIDENT.**

| Speech | Model 1 said | Model 2 said |
|---|---|---|
| **Magahi** | Hindi, confidence **0.92** | Maithili, confidence **0.98** |
| **Santali** | Kannada, confidence **0.87** | Santali, confidence **0.91** |

**A confidence threshold would have passed all four.** The Magahi speaker would have been confidently filed as a Hindi speaker, and the rest of the call conducted in a language they do not speak.

### What we do instead

SETU calls **two different Bhashini detection models on every call** and compares their answers:

| Service | Behaviour |
|---|---|
| `bhashini/iitmandi/audio-lang-detection/gpu` | Stable and confident, but its labels **stop at the twelve scheduled languages**. Anything outside that set is silently mapped onto the nearest one it knows. |
| `bhashini/ald` | Returns labels **beyond those twelve** (Santali and Maithili both came back in testing), but is less steady on short clips. |

The comparison produces one of three states:

- **`agreed`** — both models returned the same language → the stack handles this caller
- **`contested`** — they disagreed → **the caller speaks something outside the supported set** → escalate to a human, tagged **dialect gap**
- **`unconfirmed`** — only one model answered, so there is nothing to compare

> **The disagreement is the signal — not the confidence score.** `langScore` is still recorded on every call because it is useful evidence, but **it decides nothing.**

### What this produces

- The caller is **escalated to a human immediately**, with reason *AI low confidence*, tagged as a dialect gap — rather than being given wrong advice in a language they do not speak
- **Both models' predictions and the agreement state are stored on the call record**, so the evidence is auditable
- The block's gap record is **incremented**, and the Gap Map's **"Contested detections"** card moves

That card is a finding about **India's own language infrastructure**: it tells MeitY and Bhashini precisely which districts speak languages the national language stack cannot yet serve. No competing team will produce that.

### The honest caveat, stated in the code

> Every measurement behind this design was taken on **audio synthesised by Bhashini's own TTS**, not on real speech over a phone line. Synthesis artefacts are known to matter — the same English sentence scored 0.49/Telugu from one TTS voice and 0.995/English from another. **Before production, the agreement rates must be re-measured on genuine recordings from the blocks SETU serves.**

This caveat is written into `src/lib/languageDetection.ts` so it cannot quietly be forgotten. Stating it is a strength, not a weakness — it is the difference between a demo and engineering.

---

## 10 · The AI voice call, stage by stage

**Route:** `/call` (no sign-in — nobody logs in to phone SETU) · also embedded as **AI Demo Call** inside the Call Console.

### How it is built — and what it deliberately is not

**There is no LLM in this conversation.** The entire call is a **deterministic state machine** with **rule-based matching**. That is a design decision, not a limitation:

- A language model can be talked into inventing a fee, an earning figure or a scheme term. **This assistant structurally cannot** — the only course facts it can speak are fields that exist on the course record. A question it cannot answer from that record raises an **escalation** instead of an answer.
- A deterministic flow **cannot fail unpredictably in front of judges.**

### The sixteen stages

```
greeting → consent → name → location → work → family → education →
interest → travel → connectivity → preference → secondary →
recommendation → enrolment → close → done
```

1. **Greeting** — bilingual Hindi + English. The caller replies in their own language.
2. **Consent** — permission to record and share. **Nothing is recorded if consent is refused.**
3. **Name**
4. **Location** — district, block, village
5. **Current work**
6. **Family / traditional occupation**
7. **Education** — never sounds surprised at "none"
8. **Interest** — what they would like to learn
9. **Travel** — how far they can realistically go
10. **Connectivity** — is there a smartphone in the house
11. **Preference** — a job, or their own work
12. **Secondary contact** — a relative's smartphone, because the caller may be on a basic phone
13. **Recommendation** — the course, the centre, and **the reason in plain language**
14. **Enrolment details**
15. **Close** — what happens next
16. **Done**

**The detection runs on the caller's first reply after the greeting** — both models, as described above.

### How the recommendation is actually chosen

`matchCourses()` in `src/data/courseCatalogue.ts`. Every filter is a **fact about the caller or the centre** — nothing is a judgement call:

| Filter | Rule |
|---|---|
| **Travel radius** | `can-travel` → 70 km · `limited` → 25 km · `cannot-travel` → 5 km. Same block counts as 3 km, same district 22 km, otherwise 61 km |
| **Seats** | Centres with no seats left are excluded outright |
| **NSQF eligibility** | A caller's school years must meet the course's `minimumClass` |
| **Literacy** | Low literacy excludes any course that cannot be followed without reading |
| **Mobility** | Someone who cannot leave the house only gets home-based trades |
| **Smartphone** | A course needing a smartphone is excluded if there is not one |

What survives is then **ranked by explainable reasons** — matches their stated interest, matches the family trade, is close by, suits job-vs-own-work preference, and **has real local demand** (taken from the same gap data the map is built on). Most reasons matched wins, then nearest, then most seats.

**The assistant then says why**, in plain language — not *"our algorithm recommends"*, but *"this is 3 km from you, there is work for it near you, and it matches the tailoring you said you were interested in."*

### Every other case — fifteen of them, all designed

From `SETU-CONVERSATION-SCRIPT.md`, each with an exact spoken response:

| | |
|---|---|
| **A** "I don't want that course" | Asks why, stores the reason, re-matches. Twelve people rejecting tailoring for the same reason **is a finding, not noise** |
| **B** "What will I learn / earn?" | Answers **from the course record only**. Anything not in the record → escalate |
| **C** "Online / work-from-home only" | Filters to home-capable trades; checks for a smartphone; flags a **digital-access gap** if nothing fits |
| **D** "There are no jobs here anyway" | Searches this block → neighbouring blocks → self-employment → online trades → placement-linked schemes. Records `noLocalDemand` for the Gap Map |
| **E** "I want my own business" | Switches to the self-employment track. **Never quotes loan terms or interest rates** — policy belongs to a human |
| **F** **Unsupported language** | Two models disagree → escalate, tagged dialect gap. *The heart of section 9* |
| **G** "I want a person" | **Honoured immediately. Never argues, never asks why** |
| **H** Goes silent | *"Are you still there?"* → simpler words → schedules a callback, keeping everything captured |
| **I** Very poor audio | Asks them to move somewhere quieter |
| **J** Woman with household constraints | Home-based and flexible-timing options |
| **K** Already trained, wants work | Straight to placement support |
| **L** Calling on someone else's behalf | Captures whose profile it is |
| **M** A follow-up call, not a first call | Picks up the existing record |
| **N** Silence from the start | Ends cleanly, creates no profile |
| **O** Abusive or irrelevant | Closes politely, **creates no beneficiary profile**, keeps the database clean |

### The eight rules the assistant never breaks

1. **Never invent a fact** — no fee, no earning figure, no course detail, no scheme term that is not in the record. **Not knowing is an escalation, not a guess.**
2. **Never quote loan or scheme terms** — interest rates and eligibility are policy, and belong to a human.
3. **Never refuse a request for a person** — honoured immediately, without question.
4. **Never ask two questions in one turn.**
5. **Never sound surprised at a low answer** — no schooling, no phone, no work. Move on warmly.
6. **Never proceed without consent**, and never record anything if consent is refused.
7. **Never claim to be human** — *"I am SETU, a computer that helps you find training. If you would like to speak to a person, I can arrange that right away."*
8. **Never rush.** Silence is allowed. Repeat patiently.

### Built for demo reliability

This is the demo centrepiece, so it is built to survive a live room:

- **Fixed lines are pre-generated as audio at build time** (`npm run voice:build`) and served from `public/voice/hi/` and `public/voice/en/` — 25 lines per language. Only genuinely dynamic lines are synthesised live, so the demo does not depend on a network round-trip for the greeting.
- **Every Bhashini call fails soft.** Each returns `null` rather than throwing, with a deliberately short **12-second timeout** — waiting 30 seconds in front of a room is worse than dropping to text. If the network dies mid-demo, **the conversation continues on screen as text.**
- **The whole flow is completable by typed input**, so a dead microphone does not end the demo.
- **Clear indicators** for capturing versus speaking, and a specific, human message if microphone permission is denied.
- A **rehearsal mode** (`?rehearse=contested`) forces a contested detection so Case F can be practised on demand — and the page says on screen that it is doing so.

### What the screen shows during the call

A live transcript, the **current stage**, the **detection panel with both models' predictions and their agreement state**, and the fields captured so far filling in as the conversation proceeds.

---

## 11 · Bhashini — exactly how we use it

**Bhashini** (Digital India Bhashini Division, MeitY) is India's national language AI platform. It is **genuinely free** — no API fees, no usage caps for qualifying applications. It already powers UMANG, DigiLocker and Common Service Centres, and its models come from **AI4Bharat research at IIT Madras**.

> Choosing India's own language stack over a foreign API is a real differentiator with government judges — and it is also simply the right technical choice here, because no foreign service has this coverage of Indian languages.

**Endpoint:** `https://dhruva-api.bhashini.gov.in/services/inference/pipeline`

### The three services SETU uses

**1 · Audio Language Detection** — two models, compared. Covered in [section 9](#9--the-dialect-gap--our-most-important-finding).

**2 · ASR (speech → text)** — the model is chosen **per language**, because coverage differs sharply between them and no single model covers everything:

| Language | Service |
|---|---|
| Hindi | `ai4bharat/conformer-hi-gpu--t4` |
| English | `ai4bharat/whisper-medium-en--gpu--t4` |
| Bengali, Odia, Marathi, Gujarati, Punjabi | `ai4bharat/conformer-multilingual-indo_aryan-gpu--t4` |
| Tamil, Telugu, Kannada, Malayalam | `ai4bharat/conformer-multilingual-dravidian-gpu--t4` |
| Assamese, Santali | `bhashini/ai4bharat/conformer-multilingual-asr` |
| Maithili | `bhashini/iisc/asr-mai-t4` |

*The Dravidian model does not know Hindi. A single fixed service would have quietly failed for most callers.*

**3 · TTS (text → speech)** — `Bhashini/IITM/TTS` for most languages (the IIT Madras voice is the only one covering **Santali**), and `Bhashini/IISC/TTS` for Maithili.

### Voice settings, chosen for who is actually listening

```
VOICE_GENDER = 'female'     // tested clearer on the IITM models
VOICE_SPEED  = 0.85         // ~20% more time per word, without sounding artificial
```

These are tuned for **an older person on a basic phone in a noisy place** — which is the caller SETU is built for, not a developer testing on headphones.

### A documentation bug we found and worked around

Bhashini's own published ASR example includes `"input": [{"source": null}]`. **The live API rejects that with HTTP 422** (`"none is not an allowed value"`). Anyone copying the documented example straight into their code gets a failure with a confusing message. Our request bodies are built from what the API actually accepts.

### Credentials

Three values from the Bhashini ULCA portal, held in `.env` (which is gitignored): `VITE_BHASHINI_APP_ID`, `VITE_BHASHINI_UDYAT_KEY`, `VITE_BHASHINI_INFERENCE_KEY`. The **inference key** authenticates the pipeline calls.

---

## 12 · The data — every Firestore collection

Everything the application shows lives in **Firebase Firestore**, in the **asia-south1 (Mumbai)** region — data sovereignty matters for a government project, and a production deployment would move to MeitY-empanelled government cloud (NIC/MeghRaj).

| Collection | Holds | Who may read it |
|---|---|---|
| **`beneficiaries`** | Every person SETU has spoken to: profile, contact numbers, consent, training + employment status, attendance summary, call history, journey, AI flags | Admin · the official currently holding the privacy lock · a trainer, for their own trainees only |
| **`calls`** | Every call, in three kinds told apart by `recordType`: `system` (the admin's overview row), `queued` (waiting in a console), `completed` (the report an official filed) | Admin · executives for the queue and their own calls · trainers for cases assigned to them. **AI calls: admin only** |
| **`followUps`** | The automated follow-up engine's record per beneficiary: call count, purpose, outcome, next due | **Admin only** |
| **`courses`** | The course catalogue: NSQF level, job role, minimum class, literacy and smartphone requirements, duration, what is taught, tools, typical work, earning range, fee note | Any signed-in staff |
| **`centres`** | Training centres: district, block, courses, capacity, allotted, waiting, assigned resource person | Any signed-in staff |
| **`attendance`** | **One document per trainee per session** — the register, at its finest grain | Admin · the trainer who marked it |
| **`adminFlags`** | Cases a trainer flagged to the admin: reason, note, status, assigned officer | Admin · the trainer who raised it |
| **`gapData`** | The Opportunity Gap Map's blocks: coordinates, gap type, demand, capacity, trained, placed, unplaced, severity, **contested detections** | **Admin only** |
| **`staff`** | The Admin Console's staff directory — postings, courses taught, activity | Any signed-in staff · **admin writes only** |
| **`batches`** | A trainer's batches: schedule and course materials | Any signed-in staff · the assigned trainer writes their own |
| **`users`** | **The real sign-in accounts.** Document ID is the Firebase Auth UID; holds `role` and `isActive` | Yourself, plus active staff reading the directory |

**Why the `calls` collection holds three kinds of document:** the completed **report** carries no identity, which is exactly why the Completed Calls list can exist at all. It therefore cannot simply be fields added to the call. `recordType` keeps all three in one collection, as the spec requires, while letting each console query only its own kind.

**Why `attendance` is one document per person per session:** the attendance sheet, the Sessions register and each trainee's own attendance figure are then **three views of one set of documents**. They cannot drift apart, because there is only one set of facts underneath them.

**The `staff` / `users` split is deliberate.** `users` holds working login accounts and the seeder never touches it. Creating an auth account for someone else needs a server, and SETU runs on Spark — so the Admin Console's directory is `staff`, and the sections say so honestly on screen.

---

## 13 · Security rules — privacy as code

SETU runs on the free Spark plan with **no Cloud Functions**, so the spec's Part 7 visibility and privacy rules are enforced **entirely in `firestore.rules`** — at the database, not in the UI. An executive who opens the browser console and issues a query for every beneficiary is **refused by Firestore itself**.

**`tests/firestore.rules.test.ts` — 45 tests, all passing.** They run against the Firestore emulator and exercise the **exact queries and writes the consoles make**, not convenient simplified versions.

### The privacy lock

The single most important mechanism in the rules:

```
Accept a call   → in ONE atomic batch:  call.status = 'active', call.handledBy = me
                                        beneficiary.activeHandler = me
                  → identity becomes readable, and editable

Send the report → in ONE atomic batch:  call.status = 'completed'
                                        beneficiary.activeHandler = null
                  → identity becomes invisible again
```

The lock can only be **taken** when the call document in the **same write** says this official now handles the call. So an executive cannot grant themselves access to a beneficiary's identity without genuinely accepting their call. And a second executive cannot steal a call already accepted.

### The call lifecycle, enforced

```
waiting → active → report-review → completed
```

**A call cannot jump from `active` straight to `completed`.** The mandatory report review is a real state the call passes through — because a review that is only mandatory in the user interface is not mandatory at all.

### Other protections the rules enforce

| Rule | Why |
|---|---|
| A trainer may update only **their own** trainees, and only status, history, recommendation and certificate | Their job, and nothing beyond it |
| A **certificate can only be attached to a `certified` record** | Certifying and issuing are one act and must not come apart |
| A trainer may mark attendance **only at the centre they actually run** | Checked against the centre document |
| An admin may set a flag's status and assign an officer, but **cannot edit the reason, note, or who raised it** | That is the trainer's account of what happened |
| A resource person **cannot create a case for themselves** | Cases arrive only via an executive's active call |
| An official can file a report **only against a call they handled**, and only after it reached review | |
| Nothing can be **deleted**, anywhere | Deactivate, never delete — the history is the audit trail |

### The one deliberate deviation, stated openly

The **dialect-gap counter** on `gapData` can be incremented by any signed-in staff member. Gap analytics remain **admin-only to read** — but the dialect gap is discovered **by the AI line, not by an official**. In production the AI answers the phone on a server with its own credentials; on Spark there is no server, so the call runs in the browser under whichever official is signed in.

It is kept as narrow as the rules language allows: **one named counter, one step at a time, nothing else on the document touched.** A staff member can record that a dialect gap happened. They cannot read the analytics, invent a block, or move any other number. The same reasoning covers a beneficiary record created by the AI line, which must be created **cold** — with no handler holding it, so it is immediately subject to the same privacy lock as every other record.

---

## 14 · How the app talks to the database

Two patterns, both built for a demo that must not fail in front of judges.

### Reading — the slot-and-fallback pattern

Each collection has a **slot** (`src/data/source.ts`) that starts life holding **seeded sample data**, and is replaced when the Firestore query answers.

```
status:  sample  →  loading  →  firestore
                            ↘   error  (keeps whatever the slot holds)
```

- The sample is the **initial state**, not a catch block — so the fallback is structural. A query that times out cannot produce an empty map in front of a room.
- **Every section carries a source badge** — `Firestore · 80`, `Loading…`, or `Sample data · 80 · Firestore unavailable` with the reason on hover. The judge can see at a glance whether the data is live. Being able to say *"every record you are looking at is in a database, and the screen will tell you if it isn't"* is worth more than hiding the distinction.
- **Queries are role-aware.** An admin loads everything; an executive loads the queue, their own calls, and reference data; a trainer loads their own trainees, attendance, flags and batches. The queries match what the rules permit, because an executive asking for everything would simply be refused.
- **Read quota is respected.** The free tier allows 50,000 reads a day. Every query is capped, sorting happens in the browser rather than through indexed `orderBy`, and the whole set loads **once per signed-in official** rather than once per section opened.

### Writing — optimistic, with rollback and an honest error

Every action follows the same three steps (`src/data/writes.ts`):

1. **Change the slot** so the screen responds immediately
2. **Send the write**
3. **On failure, put the slot back exactly as it was and show the error**

> Step 3 is the whole point. An optimistic update that is never rolled back is a lie told to the official's face: the screen says the trainee was certified, the database disagrees, and nobody finds out until the page is reloaded.

A failed write shows a red **"NOT SAVED"** banner naming what went wrong — *"Refused: your role may not make this change"*, *"Could not reach the database — nothing was saved"* — with the raw error code appended, because a demo that hides the code makes a genuine problem impossible to debug from the room.

**Actions that must not half-fail are single atomic batches:** accepting a call takes the privacy lock with it; sending a report releases it; allotting seats moves the count and the people together; certifying issues the certificate.

---

## 15 · The technology stack

**Everything is free.** Nothing here needs a paid subscription or a trial that can expire the day before the finale.

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | **React 19** + **TypeScript 6** | Three role-based consoles in one app |
| **Build** | **Vite 8** | |
| **Routing** | react-router-dom 7 | |
| **Auth** | **Firebase Auth** | Email/password; role read from `users/{uid}` |
| **Database** | **Firebase Firestore** | **asia-south1 (Mumbai)** |
| **Hosting** | **Firebase Hosting** | Live at `setu-india.web.app` |
| **Voice AI** | **Bhashini** (MeitY) | ASR · TTS · dual-model language detection |
| **Maps** | **Leaflet + OpenStreetMap** | The Opportunity Gap Map — no API key, no billing |
| **i18n** | react-i18next | 10 locales |
| **Lint** | oxlint | |
| **Tests** | Vitest + `@firebase/rules-unit-testing` | 45 security-rules tests |
| **Scripts** | tsx | TypeScript seed scripts in Node |

### What the Spark plan costs us, and how each is handled

| Constraint | How SETU works within it |
|---|---|
| **No Cloud Functions** | Bhashini is called from the browser; Part 7 is enforced entirely in Firestore rules |
| **No Firebase Storage** | Course materials are **links** (Drive, DigiLocker); local files are demo-only, in memory, and labelled as such |
| **No service-account credentials** | The seeder signs in as an admin with the **client SDK** — which doubles as a live proof that the rules work, since a non-admin is refused |
| **50,000 reads/day** | Per-collection query caps, client-side sorting, one load per signed-in official |

---

## 16 · Languages and translation

**Ten locales**, each a flat JSON file in `src/i18n/locales/`: `en · hi · bn · or · ta · te · kn · ml · mr · gu` — **762 keys each**.

**Nothing user-facing is hardcoded.** Labels, headings, buttons, status names, error messages and the certificate's printed labels are all translation keys. **Names, IDs, dates and figures stay as data** — a trainee's name is not translated.

**The build enforces it.** `scripts/check-i18n.mjs` runs as part of `npm run build` and **fails the build** if any locale is missing a key that English has. A missing translation cannot reach the demo.

Each language loads its **correct script font** (Noto Serif Devanagari, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Oriya), so Odia renders as Odia rather than as boxes.

---

## 17 · Running, seeding and testing the project

```bash
npm run dev                  # against the real Firebase project
npm run dev:emulator         # against local Auth + Firestore emulators, auto-seeded

npm run build                # i18n check → tsc → vite build
npm run lint                 # oxlint
npm run test:rules           # 45 security-rules tests against the emulator
npm run test:bhashini        # live Bhashini API tests

npm run seed:firestore       # seed the real project — one command, safe to re-run
npm run deploy:rules         # deploy security rules + indexes
npm run deploy:indexes       # deploy composite indexes only
npm run voice:build          # pre-generate the fixed voice lines as audio
```

**The seeder writes every collection in one command** and is **keyed by document id, so re-running overwrites rather than duplicating.** It resolves real account UIDs from `users` (skipping deactivated accounts), and deals executive calls round-robin across active executives so every account that can sign in has calls of its own.

A seeded demo project contains: **24 gap blocks · 80 beneficiaries · 204 calls · 71 follow-up records · 10 courses · 22 centres · 248 attendance rows · 8 flags · 9 staff · 2 batches** — spanning **16 districts of Jharkhand**, with ten courses from Tailoring L1 through Welding, Electrical wiring, Mobile repair, Masonry, Food processing, Beauty & wellness and Driving (LMV).

All sample data is generated from a **deterministic seeded PRNG**, so the same numbers appear every time — the demo cannot surprise you.

---

## 18 · The demo path

**Two minutes, one caller, every strength visible.**

1. **Place a call.** Bilingual greeting → the detection panel announces the language → the conversation runs through work, family trade, education, interest, travel.
2. **The recommendation** appears, with the plain-language reason for it.
3. **The report** is shown exactly as the beneficiary would receive it by SMS and WhatsApp.
4. **Switch to the consoles.** The call is now in the executive's queue or Completed Calls. The block has moved on the Gap Map.
5. **Then run the second call — the Kurukh speaker.** Detection **contests**. The assistant escalates rather than guessing. The Gap Map's **contested-detections** figure moves.

> **That second call is the moment.** It is the only part of the demo that could not have been faked — and it is a finding about India's own language infrastructure that the team discovered by actually testing it.

---

## 19 · What is real, what is simulated

Stating this plainly is a strength. A judge who catches an unstated simulation stops believing everything else.

| Component | Status |
|---|---|
| **Bhashini ASR, TTS, language detection** | **Real.** Live API calls against Bhashini's production endpoint |
| **The dual-model dialect-gap finding** | **Real**, measured against the live API — on **synthesised** audio (caveat stated in the code) |
| **Firebase Auth, Firestore, security rules** | **Real.** 45 passing rules tests |
| **Every record in every console** | **Real** database documents, with a source badge proving it |
| **The Opportunity Gap Map** | **Real** Leaflet map, reading live `gapData` |
| **Conversation logic and course matching** | **Real** deterministic rules — no LLM, by design |
| **The telephony transport** | **Simulated** — browser microphone and speaker. *The pipeline is identical to production; only the transport differs.* Real cloud telephony (Exotel, Twilio, MSG91) costs money and its trials expire — a trial expiring days before the finale is a serious demo risk |
| **SMS / WhatsApp delivery** | **Simulated in-app** — the message is rendered exactly as the beneficiary would receive it |
| **The staff directory** | **Seeded**, and labelled as such on screen. Real login accounts live in `users`, untouched |
| **Local file attachments** | **Demo-only**, in browser memory, labelled as not persisted (Storage needs the paid plan) |

**What to say to judges:**

> *"In production this routes through cloud telephony, so a beneficiary calls a toll-free number from any keypad phone. Here we demonstrate the identical voice pipeline in the browser — same speech recognition, same matching, same report. Only the transport differs."*

**The stated production path:** Exotel or MSG91 for telephony and SMS — both Indian providers, which keeps data within Indian jurisdiction.

---

## 20 · The feature ranking — what matters most

Not everything in this project carries the same weight. In order:

### 🥇 1 — The Opportunity Gap Map *(Admin Console)*

**The single most important screen.** It is what turns SETU from an app that helps individuals into a **governance instrument that tells the government where to invest next**. Almost no competing team will build this, and it directly attacks the scheme's documented failure of *"no proper roadmap from planning to execution."* If time is short, protect this.

### 🥈 2 — The dialect gap, found by disagreement

The most **technically credible** thing in the project. It proves the team tested real infrastructure rather than assuming it worked, it produces a finding useful to Bhashini and MeitY themselves, and it correctly rejects the obvious-but-wrong confidence-threshold approach. **It is also the moment in the demo that cannot be faked.**

### 🥉 3 — Voice-first access with no app

The **foundation**. It is what lets SETU answer *"can an illiterate farmer with a keypad phone actually use this?"* — the question that ends roughly 70% of competing demos.

### 4 — Closed-loop outcome tracking to a real job

Others count enrolments. SETU measures **placements**, and surfaces **trained-but-unplaced** as an accountability number.

### 5 — The automation funnel

One number answering the scalability question: *"X% of calls closed by the AI with no human."*

### 6 — Privacy enforced in the database, not the UI

The privacy lock, the mandatory report stage, and 45 passing rules tests. Handling vulnerable SC-community data responsibly turns a common weakness into a strength.

### 7 — Every real-world case designed for

Fifteen cases with exact spoken responses. Most demos collapse under the first *"but what if…"*; this one has a written answer for all of them.

### 8 — Indigenous technology

**Bhashini**, India's own MeitY-built language platform, India-region hosting, and a stated path to government cloud. Not a foreign API wrapped in a demo.

---

## The one-line pitch

> **"SETU is a bridge that lets India's most excluded citizens access skilling with nothing but a phone call — and while it guides each person to a job, it quietly shows the government exactly where to build the next training centre and bring the next jobs."**

That dual solve — **individual access plus government planning** — is the unbeatable angle. Lead with it.

---

*SETU · Smart India Hackathon 2026 · Problem Statement 26097 · Team Cranial Remission (119449)*
