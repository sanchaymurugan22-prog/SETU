# SETU — Complete Project Specification

**Skill Empowerment Through Unified-voice**

Smart India Hackathon · Problem Statement **26097**
*AI-Driven Voice Assistant for Livelihood Mapping and NSQF-Aligned Skilling Recommendations for SC Communities under the GIA Component of PM-AJAY*

Organization: Ministry of Social Justice and Empowerment (MoSJE) · Category: Software · Theme: Agriculture, FoodTech & Rural Development

---

## Table of Contents

1. [The Problem](#part-1--the-problem)
2. [The Solution](#part-2--the-solution)
3. [The Application](#part-3--the-application)
4. [Console 1 — Call Console](#part-4--console-1--call-console)
5. [Console 2 — Resource Person Console](#part-5--console-2--resource-person-console)
6. [Console 3 — Admin Console](#part-6--console-3--admin-console)
7. [System-Wide Rules](#part-7--system-wide-rules)
8. [Data Structure](#part-8--data-structure)
9. [Technology Stack](#part-9--technology-stack)
10. [Why SETU Wins](#part-10--why-setu-wins)

> **Everything in this project is built on free platforms.** See [Part 9](#part-9--technology-stack) for the zero-cost stack.

---

# PART 1 — THE PROBLEM

## 1.1 The Background

The Government of India runs a scheme called **PM-AJAY** (Pradhan Mantri Anusuchit Jaati Abhyuday Yojana). Its purpose is to lift **Scheduled Caste (SC) communities** out of poverty. One of its main instruments is the **Grant-in-Aid (GIA) component**, which funds **skill training** — teach a person a trade, connect them to a job or help them start a small business, and their income rises.

On paper, everything needed already exists. Money is allocated. Training centers operate. Courses are designed and aligned to the **NSQF** (National Skills Qualifications Framework, the government's official skill-level standard). Job schemes run alongside.

**And yet the scheme keeps failing the very people it was built for.** Not because of a lack of funding, and not because opportunities don't exist — but because of a broken connection between the beneficiary and the system.

## 1.2 Where It Breaks — The Chain of Failures

### Failure 1 — The system speaks a language the beneficiary cannot use

To find and enroll in the right training, a beneficiary is expected to use **digital portals** — websites and mobile apps with forms, dropdown menus, and text instructions, mostly in English or formal, textbook Hindi.

But the actual target person is very often:

- **Low-literacy or illiterate** — cannot comfortably read or type
- **Not digitally skilled** — has never navigated a form-based app
- **A dialect speaker** — speaks a local variant, not the formal Hindi or English the portal uses
- **On a basic phone** — no smartphone, or no reliable internet

The moment they open the portal, they are locked out. The door exists, but the handle is on the wrong side.

### Failure 2 — No guidance, so choices are made blindly

Even a beneficiary who manages to get in receives **no personal guidance** on *which* training suits them. Nothing in the system understands their background, their interests, their physical limitations, or their local economic reality.

So they choose a course based on:

- rumour ("my neighbour did tailoring")
- or whatever appears first on the list
- **never** on what genuinely fits them or what jobs actually exist nearby

### Failure 3 — Mismatch leads to dropout and wasted money

Because the course was chosen blindly, one of three things happens:

- The person **isn't interested** → they drop out
- They finish the course, but there are **no jobs for that skill in their area** → the training was useless
- The course was **too advanced or wrong for their ability** → they fail or quit

Every one of these outcomes wastes public money and leaves the person exactly where they started — poor, and now discouraged.

### Failure 4 — Operational gaps on the ground

The scheme itself documents further problems: no proper roadmap from planning to execution, difficulty identifying suitable participants, **no job placement after training ends**, poor coordination between the corporation, ministries and departments, and inadequate technical and support staff at the village level.

### Failure 5 — Nobody tracks outcomes

Systems count *enrollments*. Almost nothing tracks whether a trained person actually got a job. So the scheme cannot tell what works, and cannot fix what doesn't.

## 1.3 The Problem, Stated Simply

> The people who need skilling the most are the ones most excluded from it — because the tools built to deliver it require reading, typing, smartphones, internet and formal language, none of which these beneficiaries have. Those who do get in receive no personalized guidance, enroll in the wrong training, drop out, and stay poor. The scheme spends money, but outcomes do not change — and nobody measures whether training ever led to a job.

## 1.4 A Real Example — Ravi, Living the Problem

**Ravi** is 29, from an SC community in a village in Ranchi district, Jharkhand.

- He studied up to 4th standard. He can read a few words slowly, but cannot fill a form.
- He speaks a local dialect at home, not the formal Hindi used on government websites.
- He owns a basic keypad phone. His son has a smartphone, but Ravi cannot use apps.
- He does daily-wage labour. Work is irregular — some weeks there is none.

**What Ravi wants:** a steady skill that earns regular income.

**Attempt 1 — The portal.** Ravi hears about a government skilling scheme and is told to "apply online." His son opens the portal. The screen is full of English text, dropdowns, and fields Ravi doesn't understand. No voice. No dialect. Nobody explaining. After ten minutes they give up. *Ravi is shut out at the very first step.*

**Attempt 2 — Choosing blind.** Weeks later, a training centre in the nearest town has open seats in "computer basics." Someone tells Ravi to just join that. He has no interest in computers, has never used one, and the town is 25 km away — unaffordable to travel daily. But it is the only thing anyone pointed him toward. *He enrolls in the wrong course, chosen by accident.*

**Attempt 3 — The dropout.** He attends two weeks. He cannot follow material that assumes reading he doesn't have. Travel cost eats his earnings. He quits. *Training money spent, nothing gained.*

**The aftermath.** Ravi returns to daily-wage labour — poorer for the wasted travel, now convinced "these schemes aren't for people like me."

Meanwhile, there was a **welding training programme in his own block, 3 km away**, with real local job demand, perfectly matched to his hands-on strength. *Nothing in the system ever told him it existed or that it suited him.* The right opportunity was there all along. The system simply had no way to connect Ravi to it.

## 1.5 Why This Is Still Unsolved

- Existing portals assume literacy, smartphones and internet that the target group does not have
- Nothing currently **talks** to beneficiaries in their own dialect and guides them personally
- Nobody has connected *who this person is* + *what they are capable of* + *what jobs exist near them* into one accessible conversation
- Nobody tracks the journey through to actual employment

The exclusion continues, quietly, at scale, across thousands of villages.

---

# PART 2 — THE SOLUTION

## 2.1 The Core Idea

**SETU replaces forms with a phone conversation.**

The beneficiary needs **no app, no internet, no literacy, and no smartphone**. They simply **call a toll-free number and talk** to an AI voice assistant in their own language and dialect.

The assistant understands their background, interests and constraints, then recommends the right NSQF-aligned course and a real local opportunity. When the AI cannot handle something, the call escalates to a human. After the call, SETU tracks the beneficiary all the way to employment, using automated follow-up calls that scale to thousands, with humans stepping in only where they genuinely add value.

> **The beneficiary uses only a phone call. The three consoles are for officials.**

## 2.2 The Name

**SETU** means **"bridge"** in Hindi and Sanskrit.

**Full form: Skill Empowerment Through Unified-voice.**

The name captures the mission exactly: SETU is the bridge connecting India's most excluded citizens to the skilling system they currently cannot reach.

## 2.3 Why a Phone Call — The Feasibility Proof

This is the single most important design decision, and the data supports it decisively.

| Metric | Figure | What it means for SETU |
|---|---|---|
| Wireless subscribers in India | **~1.17 billion** (TRAI, June 2025) | Nearly every Indian can receive a call |
| Rural mobile penetration | **58.8%** (vs 125.3% urban) | Household-level access is higher still, since phones are shared |
| Feature/keypad phone users | **~250 million** still on 2G | A quarter-billion people no app can reach |
| Villages with call network coverage | **88.9%** | Voice works in roughly 9 of 10 villages |
| **Rural internet penetration** | **only 37%** (vs 69% urban) | **~63% of rural India cannot rely on an app** |
| Adults owning phones | ~70%, of whom ~20% use basic phones | Large non-smartphone base, concentrated rurally |

**The conclusion:**

> Every app-based solution excludes ~250 million feature-phone users and the ~63% of rural India without reliable internet. SETU requires only the ability to receive a phone call — which nearly all 1.17 billion connections can do.

*Note: verify these figures against TRAI's latest subscriber report before presenting, as government judges may know current official numbers.*

## 2.4 Who SETU Is For

- **Scheduled Caste community members** — the defined PM-AJAY beneficiaries
- **Rural and semi-urban** residents, especially in villages and small towns
- **Low-literacy or illiterate** people who cannot navigate text-heavy apps
- **Low digital exposure** — never comfortable with smartphone apps
- **Dialect speakers**, not fluent in formal Hindi or English
- **Low-income, livelihood-seeking** people who need a skill or job to escape poverty

For the small minority with **no personal phone**, SETU still reaches them through the **secondary contact number** (a relative's phone) and through **field officers, ASHA and Anganwadi workers** who can assist a call from a shared phone. Nobody is structurally excluded.

## 2.5 Core Features

1. **Voice-first, no-app access** — beneficiaries interact entirely by phone call (IVR), speaking and listening, never reading or typing. Works on the most basic phone with no internet on their side.

2. **Dialect-aware conversational AI** — talks naturally in the beneficiary's regional language and dialect, and understands spoken answers.

3. **Intelligent profiling** — captures education, family/traditional occupation, current work, skills, interests, mobility constraints, and job-versus-business preference into a stored profile.

4. **Smart matching** — combines *who the person is* + *their ability and interest* + *what training and jobs exist near their block* to recommend the right NSQF-aligned course and a real local opportunity.

5. **Live human escalation** — if the AI is unsure, or the beneficiary asks for help, the case escalates to a human.

6. **Consent capture** — the AI asks permission to record and share the conversation, and logs the consent. Privacy-compliant by design.

7. **Confidence flagging** — when the AI is not confident it understood correctly, it flags the call for human review rather than guessing. A built-in safety net against wrong advice.

8. **Multi-channel reporting** — after every call, a report is sent to the beneficiary by **SMS and WhatsApp** (primary number always; secondary number where available; WhatsApp only where WhatsApp exists), stored in the database, and made visible to the relevant staff.

9. **Secondary contact channel** — because beneficiaries often have basic phones, SETU captures a family member's smartphone number so follow-up and reports are never blocked.

## 2.6 The Unique Differentiators

These are what separate SETU from every competing solution.

### 10. The Opportunity Gap Map — SETU's signature feature

As calls come in, SETU aggregates **demand versus availability, block by block**, and shows administrators a live map:

- *"60 people in this area want tailoring, but there is no training centre"*
- *"40 trained welders here have no local jobs"*

This transforms SETU from an individual-help app into a **governance and planning instrument** that tells the government **where to invest next**. Almost no competing team will build this.

### 11. Closed-loop outcome tracking

SETU tracks the full lifecycle — **recommendation → enrollment → attendance → completion → actual employment** — directly attacking the scheme's biggest failure ("trained but never placed") and producing real placement metrics.

### 12. Tiered automated follow-up with an automation funnel

Routine status checks run on automated AI calls; only problems escalate to humans. Administrators see a live funnel — *"82% of follow-ups fully automated, 13% executive, 5% expert"* — proving national scalability without an army of staff.

### 13. Self-learning matching

When beneficiaries reject courses or drop out, SETU learns from the **recorded reasons** and refines recommendations for similar profiles over time, improving region by region.

## 2.7 The Automated Follow-Up Engine

This is the machinery that lets SETU scale to millions.

**Tier 1 — Automated AI calls (no human).**
SETU automatically calls the beneficiary (or the secondary number) on a schedule to ask simple status questions: *Did you enroll? Are you attending? Any problem?* **Most follow-ups end here.**

**Tier 2 — Call executive (human, general).**
Triggered only when an automated call detects a problem, confusion, or a question. Executives handle rescheduling, re-explaining, and basic support.

**Tier 3 — Resource person (human, expert).**
Triggered only for genuine skilling issues — wrong course fit, domain questions, placement problems. The scarce expert's time is protected.

**Escalation chain:**

```
Automated AI call → Call executive → Resource person → Field officer (on-ground)
```

**When automated calls fire:**

- A few days after a recommendation — *did you enroll?*
- After enrollment — *did you start attending?*
- Periodically during the course — *still attending? any issue?*
- After completion — *did you get placed?*
- Whenever a milestone is overdue — a nudge

## 2.8 The Complete Beneficiary Journey — Ravi, With SETU

**Stage 0 — Awareness.** Field officers, gram panchayat notices, and ASHA/Anganwadi workers spread one toll-free number: *"Just call this number and talk. No app, no reading."*

**Stage 1 — The first call.** Ravi dials on his basic phone. The AI answers in his dialect: *"Namaste, I'm SETU. I help you find skill training and work near you. May I ask you a few questions and record this call to help you better?"* Ravi says yes. **Consent is captured and logged.**

**Stage 2 — The conversation.** The AI asks, one thing at a time: What work do you do now? What did your family traditionally do? What are you interested in? Can you travel, or do you need something nearby? Do you want a job, or your own business? Ravi answers in his dialect. A **profile is built** in the background.

**Stage 3 — Secondary number.** *"Do you have a family member with a smartphone we can also reach?"* Ravi gives his son's number. **Stored as the follow-up channel.**

**Stage 4 — The recommendation.** Combining Ravi's profile with local training and job data, the AI finds a **welding course 3 km away** with genuine local demand and recommends it.

**Stage 5 — Confidence check.** The AI understood Ravi well, so it proceeds. Had it been unsure, or had Ravi been confused or dissatisfied, the case would escalate to a human.

**Stage 6 — The report.** Call ends. An **SMS and WhatsApp report in his language** goes to Ravi and to his son. The report is stored and made visible to the relevant staff.

**Stage 7 — Automated follow-up begins.** SETU now tracks Ravi automatically, calling on a schedule to check progress, escalating only when something is wrong.

**Stage 8 — Enrollment → attendance → certification → job.** Ravi enrolls, attends, is certified on finishing the course, and is connected to local welding demand. Each milestone is tracked, with gentle automated check-ins while he progresses and escalation whenever he stalls.

**At the system level:** Ravi's calls — and thousands like them — feed the **Opportunity Gap Map**, showing administrators that his block has welding demand met but, say, tailoring demand unmet, guiding where the government invests next.

## 2.9 Every Real-World Case, Handled

A working demo must survive the judge's question: *"But what if…?"* Here is the answer to every one.

| Case | How SETU handles it |
|---|---|
| **Beneficiary dislikes the recommended course** | SETU re-profiles through conversation and recommends an alternative that still matches local demand. If the reason is unclear, escalates to a resource person. The profile updates so the rejected option is never re-suggested. |
| **Enrolls but doesn't attend** | An automated call asks why. *"Too far"* → searches a closer or online alternative. *"No time"* → offers flexible/part-time options. *"Lost interest"* → re-profiles for a different trade. Unclear or emotional → escalates to executive, then resource person. |
| **No jobs nearby for any course they like** | SETU widens the search in tiers: (1) nearby blocks, (2) self-employment/enterprise options, (3) online/remote-capable skills, (4) courses tied to government placement or migration support. It never dead-ends, and flags the "no local demand" signal to the **Opportunity Gap Map**. |
| **Wants only online / work-from-home** | Filters to remote-friendly skills. Checks connectivity via the secondary number. If connectivity is a barrier, flags a digital-access gap and points to the nearest common service centre. |
| **Wants their own business, not a job** | Switches to the **self-employment track** — enterprise-oriented training, plus scheme, loan-eligibility and financial-structuring guidance. |
| **Dialect the AI can't understand** | Confidence flag triggers automatically → escalates to a human who speaks the dialect, and logs a **dialect gap** so administrators know which languages need better coverage. |
| **No secondary number available** | Marked **basic-phone only**; all follow-up routes as automated voice calls to their own number. Nothing breaks — the flow adapts to voice-only. |
| **Completes the course but gets no job** | Flagged **trained-but-unplaced**. Escalates to a resource person for placement support; re-checks local, nearby, online and scheme-linked demand. Administrators see trained-but-unplaced counts as a key accountability metric. |
| **Stops responding entirely** | Repeated unanswered automated calls → escalate to an executive for a manual attempt → then to the **field officer** via admin for an in-person check. Nobody silently disappears. |
| **Progressing happily** | Fully automated. Gentle check-ins confirm attendance and completion. **Zero human time consumed** — this is what allows national scale. |
| **Asks something the AI can't answer** | Immediate escalation: AI → call executive (general) → resource person (skilling-specific). A human is always reachable. |
| **Abusive or irrelevant call** | The AI detects it, closes politely, and creates no beneficiary profile. Keeps the database clean. |

---

# PART 3 — THE APPLICATION

## 3.1 The Architecture in One Picture

```
                    ┌──────────────────────────┐
                    │      BENEFICIARY         │
                    │  (basic phone, no app)   │
                    └────────────┬─────────────┘
                                 │  phone call (IVR)
                                 ▼
                    ┌──────────────────────────┐
                    │     AI VOICE ASSISTANT   │
                    │  dialect conversation,   │
                    │  profiling, matching,    │
                    │  auto follow-up calls    │
                    └────────────┬─────────────┘
                                 │  escalates only when needed
                                 ▼
        ┌────────────────────────────────────────────────┐
        │          SETU WEB APPLICATION (officials)      │
        ├────────────────┬──────────────────┬────────────┤
        │  CALL CONSOLE  │ RESOURCE PERSON  │   ADMIN    │
        │   (executive)  │     CONSOLE      │  CONSOLE   │
        └────────────────┴──────────────────┴────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   FIREBASE (India region)│
                    │  Auth · Firestore · Host │
                    └──────────────────────────┘
```

## 3.2 One Application, Three Consoles

SETU is a **single web application** with **three role-based consoles**. A user logs in once, and the system shows them the console matching their role.

| Console | Who uses it | Core purpose |
|---|---|---|
| **Call Console** | Call Executives | Handle escalated calls, correct data, send reports |
| **Resource Person Console** | Resource Persons | Deliver courses (trainer) + handle expert escalations |
| **Admin Console** | Officials / Administrators | Full oversight, planning, and the Opportunity Gap Map |

**The beneficiary never uses the application.** They only ever make and receive phone calls.

## 3.3 How a Call Technically Reaches the App

This is essential to understand, because it is counter-intuitive.

The call executive does **not** use a separate physical phone. Calls are routed over the internet through a **cloud telephony service** (Exotel, Twilio, Plivo or similar) directly **into the web application**. The executive talks through their **computer with a headset**, inside the app — exactly like a call-centre agent.

Because the call flows *through* the app:

- The app knows **who accepted it**, that they are **connected**, and when it **starts and ends**
- The audio is **captured and transcribed**, which is how the AI generates the report

**For the hackathon demo:** build a **simulated** call flow first (in-browser voice) so the demo is guaranteed to work. Add real telephony only if time and budget allow.

## 3.4 The Three Roles at a Glance

| | Call Executive | Resource Person | Admin |
|---|---|---|---|
| **Main job** | Handle escalated calls | Train courses + expert guidance | Monitor everything + plan |
| **Adds data** | Corrects AI-captured data, call notes | Attendance, status, recommendations | Users, courses, centres |
| **Sees** | Only their own calls | Only their own calls and trainees | **Everything** |
| **Cannot see** | Other executives' calls, AI calls | Other resource persons' calls, AI calls | — |

---

# PART 4 — CONSOLE 1 — CALL CONSOLE

**For:** Call Executives (customer-care staff)

**Purpose:** Handle escalated beneficiary calls, view and correct data during the call, transfer to experts when needed, and send an AI-generated report after every call.

**Structure:** One main screen with **two tabs** — Waiting Calls and Completed Calls.

## 4.1 TAB 1 — Waiting Calls

This tab contains the **entire call-handling flow**, from queue through to report sending, in three sequential stages.

### Stage 1 — The Queue

**Shows:**

- All calls currently waiting for a human executive
- Each waiting call displays **only non-personal information**:
  - **Reason tag** — why it is waiting (AI low confidence · beneficiary requested human · course question · follow-up, unable to manage)
  - **Wait time**
  - **Queue position**
- **No beneficiary personal identity is shown here** — no name, number or village

**The executive can:**

- **Sort** by wait time (longest waiting first)
- **Filter** by reason tag
- **Pick any call** based on urgency, wait time or purpose
- **Accept** — this is the **only** action available. **There is no decline option.**

### Stage 2 — Active Call

**Shows:**

- The **beneficiary's details become visible** — only now, only during the call
- All data the **AI already captured** is pre-filled: name, location (state/district/block/village), education, occupation, interests, constraints, primary number, secondary number, consent status, and what the AI discussed and recommended

**The executive can:**

- **View** the full beneficiary profile
- **Edit any data** — correcting anything the AI captured wrongly, according to the beneficiary's wishes
- **Add call notes**
- **Add or correct the secondary contact number**
- **Transfer to a Resource Person** as a **callback case** (not a live transfer), selecting a **reason-for-transfer**:
  - Course question
  - Person-specific
  - Dissatisfaction

**Behaviour:**

- **Editing is permitted ONLY while the call is active**
- The moment the call ends, this stage closes and **all editing locks**

### Stage 3 — Report Review

**Shows:**

- The **AI-generated report** — what was discussed, the course recommended, actions taken, and the outcome

**The executive can:**

- **Review and assess** the report
- **Edit** it if the AI got anything wrong
- Click **Send**

**On Send:**

- The report is **saved** to the beneficiary's record
- The report is **sent to the beneficiary**:
  - **SMS** — primary number, and secondary if available
  - **WhatsApp** — primary if WhatsApp exists, and secondary if WhatsApp exists
- **Beneficiary personal details are hidden again**
- The call moves to **Completed Calls**

> This stage is **modal and cannot be skipped**. No call can end without a report being reviewed and sent.

## 4.2 TAB 2 — Completed Calls

**Shows:**

- **Only the calls this executive personally handled** — not other executives' calls, and not AI calls
- For each: the **AI report only** — what happened, what was recommended, actions taken, outcome
- **Beneficiary personal identity is hidden** — no name, phone or village

**The executive can:**

- Browse and review their own completed calls' reports

## 4.3 Privacy Rule — Call Console

| Location | Beneficiary personal details visible? |
|---|---|
| Waiting Calls → Queue | **No** |
| Waiting Calls → Active Call | **Yes** — only here |
| Waiting Calls → Report Review | **Yes** — briefly |
| Completed Calls | **No** — report only |

## 4.4 Structure Map

```
CALL CONSOLE
│
├── [ Waiting Calls ]
│     └── Queue  ── reason tag · wait time · position · sort/filter · ACCEPT ONLY
│           └── Active Call  ── details visible · edit while active · transfer option
│                 └── Report Review  ── review/edit AI report → SEND → saved + sent
│
└── [ Completed Calls ]
      └── This executive's calls only → AI report only, no personal info
```

---

# PART 5 — CONSOLE 2 — RESOURCE PERSON CONSOLE

**For:** Resource Persons — who wear **two hats**: **Trainer** (delivers the course, in-centre or online) and **Expert** (handles escalated guidance).

**Structure:** One main screen with **five tabs**.

## 5.1 TAB 1 — Beneficiaries *(Trainer hat)*

**Shows:**

- All people **enrolled in the course(s) this resource person handles**
- **Full trainee details are visible** — the trainer must know who they are teaching

**The resource person can:**

- **View each enrolled trainee's profile**
- **Mark attendance** — when a scheduled session's time arrives, that session's attendance page (for that specific date and time) opens; attendance is marked **per person**. Whether the session is in-person or online depends on how that course is scheduled.
- **Update training status** through fixed stages, each requiring a **mandatory description**:

  ```
  Enrolled → Attending → Irregular → Certified → Dropped
  ```

  There is no separate *Completed* stage. Finishing the course is what issues the
  certificate, so **Certified means the course is finished and the certificate issued** —
  one stage, not two that can drift apart.

- **Add future recommendations once status = Certified** — **both**:
  - a **next upskilling course** (to advance them further), and
  - a **job recommendation**
- **Flag to Admin** — a button beside each trainee's profile for stuck cases. This notifies the administrator so the right people are dispatched to inspect and help.

**Automatic behaviours:**

- When training status is set to **Certified**, a **certificate is generated automatically and sent to the beneficiary** — no manual issuing required
- The **dropout or rejection reason is captured inside the status-update description** — no separate field needed

## 5.2 TAB 2 — Course Materials / Details

**Holds:**

- Course **schedule and timings** (set by the trainer — daily, weekly, or as decided). **This schedule drives when attendance pages open.**
- **Location** for in-person sessions, or **online link** for online sessions
- **Course materials** — notes, resources and content to share with trainees

## 5.3 TAB 3 — Waiting Calls *(Expert hat)*

Handles escalated cases, split into **two parts**:

- **Course-related** — trade or course-specific expert questions: what will I learn, what tools, what jobs afterwards, what earnings, wrong course fit
- **Common-related** — general guidance escalations: career decisions, placement problems, self-employment guidance, dissatisfaction, repeated dropout

**Behaviour:**

- Works exactly like the Call Console's flow: **queue → accept → active call → report review → send**
- **Beneficiary personal details are hidden except during an active call**
- Cases arrive here **only via the Call Console** — never directly

## 5.4 TAB 4 — Completed Calls *(Expert hat)*

**Shows:**

- **Only this resource person's own** completed calls
- Split into the same **two parts** — Course-related and Common-related
- The **AI reports** of those calls
- **Beneficiary personal identity hidden**

## 5.5 TAB 5 — Milestones

**Shows:**

- **Only the trainees this resource person trained to successful completion**
- Their **completion reports**
- This is the resource person's achievement and record view

## 5.6 Privacy Rule — Resource Person Console

| Tab | Beneficiary personal details visible? |
|---|---|
| Beneficiaries (own batch) | **Yes** — trainer must know who they teach |
| Course Materials | Not applicable — course info, not personal |
| Waiting Calls | **No** — except during an active call |
| Completed Calls | **No** — report only |
| Milestones | **Yes** — own trainees' completion records |

## 5.7 Structure Map

```
RESOURCE PERSON CONSOLE
│
├── [ Beneficiaries ]     ── own trainees · per-person attendance ·
│                            status + mandatory description ·
│                            completion recommendations (course + job) ·
│                            flag-to-admin · auto-certificate on Completed
│
├── [ Course Materials ]  ── schedule & timings · location/online link · materials
│
├── [ Waiting Calls ]     ── Course-related | Common-related
│                            (queue → accept → active call → report → send)
│
├── [ Completed Calls ]   ── own calls only · Course-related | Common-related
│
└── [ Milestones ]        ── own trainees trained to completion + reports
```

---

# PART 6 — CONSOLE 3 — ADMIN CONSOLE

**For:** Officials and administrators

**Purpose:** Full oversight of the entire SETU system — all people, all calls, all courses, all outcomes — plus the governance-planning tools that make SETU unique.

**Structure:** One main screen with **eight features**.

## 6.1 FEATURE 1 — Beneficiaries

**Shows:** All beneficiaries in the system with **full details** (the admin sees everything, unlike executives and resource persons).

**The admin can:**

- **Filter for AI-flagged or stalled beneficiaries** needing attention — dropped off, not responding, stuck
- **Search and filter** by state, district, block, course, training status or employment status
- **View any beneficiary's full journey** end to end — profile, all calls, recommendations, enrollment, attendance, completion, placement

## 6.2 FEATURE 2 — Call Executives

**Shows:** All call executives with full details.

**The admin can:**

- **Add new call executives** — create account, assign role
- **Manage existing executives** — view activity, deactivate if needed

## 6.3 FEATURE 3 — Resource Persons

**Shows:** All resource persons with full details.

**The admin can:**

- **Add new resource persons** — create account, assign role
- **Assign them to courses and training centres**
- **Manage existing resource persons**

## 6.4 FEATURE 4 — Calls *(three parts)*

All calls across the system:

**Part A — Executive Calls** — all calls handled by call executives, with their reports

**Part B — Resource Person Calls** — all calls handled by resource persons (Course-related and Common-related)

**Part C — AI Calls** — all calls handled by the AI. Each shows the **AI report**, **outcome** (fully handled / escalated / follow-up / failed), **escalation reason**, and **confidence score**.

> **The Automation Funnel lives here** — the percentage of calls handled by AI versus executive versus resource person. *This is the scalability proof: the single number showing SETU works at national scale.*

The admin sees **all call types across all staff** — complete oversight.

## 6.5 FEATURE 5 — Follow-up Reports

**Shows:** All **AI follow-up calls** with user details. For each beneficiary: **how many follow-up calls** were made, **what follow-up** was performed, the outcomes, and full details.

This tracks the automated follow-up engine's activity across every beneficiary.

## 6.6 FEATURE 6 — Courses & Centres

**Shows:** All courses with their **training-centre information**. Per course and centre: **enrolled / allotted / waiting-for-allotment** counts.

**The admin can:**

- **Add a new course**
- **Add a new training centre**

**Automatic allotment logic:**

- Beneficiaries are **auto-allotted** to a centre based on **location and capacity**
- When centres in a city are **full** and more people in that city need the course, the admin **creates a new centre**, and the **remaining waiting users are automatically allotted** to it, with an **assigned resource person**

## 6.7 FEATURE 7 — Admin Flags

**Shows:** All cases **flagged to the admin** via the resource person's flag-to-admin button — stuck cases, repeated dropouts, beneficiaries needing on-ground help.

**The admin can:**

- Take **necessary actions** on each flagged case
- **Assign** the right person or field officer to inspect or handle it — *assignment control lives here*

## 6.8 FEATURE 8 — Opportunity Gap Map ⭐

*SETU's signature feature. Holds two things together — the complete planning story in one place.*

### A. The Visual Map — demand versus availability, by block and city

- Where **course demand exists but there is no training centre**
  → *"60 people want tailoring here, no centre"*
- Where **trained people have no local jobs**
  → *"40 trained welders here, no local jobs"*
- A block and city-wise view telling the government **where to invest next**

### B. The Summary Analytics

- **Enrollment rate**
- **Completion rate**
- **Placement rate**
- **Trained-but-unplaced counts**
- **Course demand by location** — planning data
- **Dialect-gap data** — which languages and dialects the AI struggles with

> This feature is what turns SETU from an individual-help tool into a **governance instrument**. It is the single biggest differentiator against competing teams.

## 6.9 Structure Map

```
ADMIN CONSOLE
│
├── [ Beneficiaries ]        ── all beneficiaries + AI-flagged/stalled filter
├── [ Call Executives ]      ── all executives + add new
├── [ Resource Persons ]     ── all resource persons + add new + assign to courses
├── [ Calls ]                ── Executive | Resource Person | AI
│                               (Automation Funnel inside AI Calls)
├── [ Follow-up Reports ]    ── all AI follow-up calls + full details
├── [ Courses & Centres ]    ── courses · centres · enrolled/allotted/waiting ·
│                               add course · add centre · auto-allotment
├── [ Admin Flags ]          ── flagged cases · actions · assignment control
└── [ Opportunity Gap Map ]  ── visual demand-vs-availability map
                                + all rates and analytics
```

---

# PART 7 — SYSTEM-WIDE RULES

## 7.1 Visibility Rule

| Role | Can see |
|---|---|
| **Call Executive** | Only their own completed calls |
| **Resource Person** | Only their own calls and their own trainees |
| **AI Calls** | Visible to **Admin only** |
| **Admin** | **Everything** — all beneficiaries, all staff, all call types, all courses, all outcomes |

## 7.2 Routing Rule

- **Routine AI follow-ups** run automatically, with no human involvement
- **Any dispute or failed follow-up goes to the Call Console first**, tagged with a reason (e.g. *"follow-up — unable to manage"*)
- The Call Console executive then **transfers skilling-related cases to a Resource Person**, selecting Course-related or Common-related
- **A Resource Person never receives a case directly** — always via the Call Console

```
AI  →  Call Console (executive)  →  Resource Person  →  Field Officer
```

## 7.3 Privacy Rule

**Beneficiary personal details** — name, phone numbers, village, personal identity:

- Hidden in all queues
- Visible **only during an active call** and briefly during report review
- Hidden again in all completed-call views
- **Exception:** a Resource Person sees full details of **their own trainees** (Beneficiaries and Milestones tabs), because a trainer must know who they teach
- **Exception:** the Admin sees everything

**AI report** — discussion summary, recommendation, actions, outcome, without personal identifiers:

- Visible in completed-call views to the staff member who handled it, and to the Admin

## 7.4 Automatic Behaviours

| Trigger | Automatic action |
|---|---|
| Training status set to **Certified** | Certificate generated and sent to the beneficiary |
| Scheduled session time arrives | That session's attendance page opens |
| Beneficiary location + capacity | Auto-allotment to the nearest available centre |
| New centre created when full | Remaining waiting users auto-allotted with assigned resource person |
| Call ends | AI report generated for review |
| Report sent | Delivered via SMS + WhatsApp (primary + secondary as available) |
| Milestone overdue | Automated follow-up call triggered |

---

# PART 8 — DATA STRUCTURE

*Firestore collections. Lock this before building — changing it mid-build is expensive.*

## 8.1 `beneficiaries`

```
beneficiaries/{beneficiaryId}
├── beneficiaryId          string   auto-generated
├── name                   string
├── age                    number
├── gender                 string
├── primaryNumber          string   their own phone
├── secondaryNumber        string   relative's smartphone (nullable)
├── hasWhatsAppPrimary     boolean
├── hasWhatsAppSecondary   boolean
├── isBasicPhoneOnly       boolean  true if no secondary number
├── preferredLanguage      string   language/dialect
│
├── location
│   ├── state              string
│   ├── district           string
│   ├── block              string
│   ├── village            string
│   ├── latitude           number
│   └── longitude          number
│
├── profile
│   ├── educationLevel     string
│   ├── familyOccupation   string
│   ├── currentWork        string
│   ├── skills             array<string>
│   ├── interests          array<string>
│   ├── mobilityConstraint string   can travel / limited / cannot travel
│   ├── workPreference     string   job / self-employment / online-only
│   └── digitalAccess      string   none / basic / smartphone
│
├── consent
│   ├── given              boolean
│   ├── givenAt            timestamp
│   └── method             string   voice confirmation
│
├── trainingStatus         string   new / recommended / enrolled / attending /
│                                   irregular / certified / dropped
├── employmentStatus       string   in-training / seeking / placed / unplaced /
│                                   not-tracked
│                                   Training and employment are tracked separately:
│                                   a beneficiary is certified AND unplaced at the
│                                   same time, and that pair is what the Opportunity
│                                   Gap Map counts as trained-but-unplaced.
├── statusHistory          array of { status, description, changedBy,
│                                     changedAt }
│
├── recommendation
│   ├── courseId           string
│   ├── centreId           string
│   ├── recommendedAt      timestamp
│   ├── recommendedBy      string   ai / executive / resourcePerson
│   └── confidenceScore    number   0-1
│
├── rejectedCourses        array of { courseId, reason, rejectedAt }
├── completionRecommendation
│   ├── nextCourseId       string
│   └── jobRecommendation  string
│
├── flags
│   ├── isAIFlagged        boolean
│   ├── isStalled          boolean
│   ├── isFlaggedToAdmin   boolean
│   └── flagReason         string
│
├── assignedResourcePerson string   userId (nullable)
├── activeHandler          string   userId on an active call (nullable) — privacy lock
├── activeCallId           string   callId holding the lock (nullable)
├── createdAt              timestamp
└── updatedAt              timestamp
```

## 8.2 `calls`

```
calls/{callId}
├── callId                 string
├── beneficiaryId          string
├── callType               string   ai / executive / resourcePerson
├── subType                string   course-related / common-related (RP only)
├── direction              string   inbound / outbound-followup
├── status                 string   waiting / active / report-review / completed
│
├── queue
│   ├── reasonTag          string   ai-low-confidence /
│   │                               beneficiary-requested-human /
│   │                               course-question /
│   │                               followup-unable-to-manage
│   ├── enteredQueueAt     timestamp
│   └── waitDuration       number   seconds
│
├── handledBy              string   userId (null for pure AI calls)
├── assignedTo             string   resource person a callback case is routed to
│                                   (RP calls only, nullable)
├── startedAt              timestamp
├── endedAt                timestamp
├── duration               number   seconds
│
├── aiReport
│   ├── summary            string
│   ├── recommendation     string
│   ├── actionsTaken       array<string>
│   ├── outcome            string
│   └── confidenceScore    number
├── editedReport           string   executive's edited version (nullable)
├── reportSentAt           timestamp
├── reportChannels         array<string>   sms-primary, whatsapp-primary, ...
│
├── transferredTo          string   userId (nullable)
├── transferReason         string   course-question / person-specific /
│                                   dissatisfaction
├── transferredFromCallId  string   executive call this RP case came from (nullable)
├── outcome                string   resolved / escalated / followup-scheduled /
│                                   failed
└── createdAt              timestamp

calls/{callId}/private/detail      (identity-bearing — same visibility as the beneficiary)
├── transcript             string
├── aiContext              map      what the AI discussed and recommended before escalation
└── notes                  string   handler's call notes
```

## 8.3 `followUps`

```
followUps/{followUpId}
├── followUpId             string
├── beneficiaryId          string
├── attemptNumber          number
├── purpose                string   did-you-enroll / are-you-attending /
│                                   any-problem / did-you-get-placed /
│                                   milestone-overdue
├── channel                string   primary / secondary
├── scheduledFor           timestamp
├── attemptedAt            timestamp
├── answered               boolean
├── response               string
├── outcome                string   ok / problem-detected / no-answer / escalated
├── escalatedToCallId      string   (nullable)
└── createdAt              timestamp
```

## 8.4 `courses`

```
courses/{courseId}
├── courseId               string
├── courseName             string
├── nsqfLevel              string
├── description            string
├── durationWeeks          number
├── skillCategory          string
├── suitableFor            array<string>   hands-on, home-based, online, ...
├── isOnlineCapable        boolean
├── isActive               boolean
└── createdAt              timestamp
```

## 8.5 `centres`

```
centres/{centreId}
├── centreId               string
├── centreName             string
├── courseId               string
├── location
│   ├── state              string
│   ├── district           string
│   ├── block              string
│   ├── address            string
│   ├── latitude           number
│   └── longitude          number
├── mode                   string   in-person / online / hybrid
├── onlineLink             string   (nullable)
├── capacity               number
├── currentEnrolled        number
├── isFull                 boolean
├── assignedResourcePerson string   userId
├── schedule
│   ├── frequency          string   daily / weekly / custom
│   ├── days               array<string>
│   ├── startTime          string
│   └── endTime            string
├── isActive               boolean
└── createdAt              timestamp
```

## 8.6 `attendance`

```
attendance/{attendanceId}
├── attendanceId           string
├── centreId               string
├── courseId               string
├── sessionDate            date
├── sessionTime            string
├── mode                   string   in-person / online
├── markedBy               string   userId (resource person)
├── markedAt               timestamp
└── records                array of { beneficiaryId, present: boolean }
```

## 8.7 `users`

```
users/{userId}
├── userId                 string   Firebase Auth UID
├── name                   string
├── email                  string
├── phone                  string
├── role                   string   executive / resourcePerson / admin
├── assignedCourses        array<string>   courseIds (resource persons)
├── assignedCentres        array<string>   centreIds (resource persons)
├── languages              array<string>   dialects they can handle
├── isActive               boolean
├── createdBy              string   admin userId
└── createdAt              timestamp
```

## 8.8 `adminFlags`

```
adminFlags/{flagId}
├── flagId                 string
├── beneficiaryId          string
├── raisedBy               string   userId (resource person)
├── raisedAt               timestamp
├── reason                 string
├── description            string
├── status                 string   open / assigned / resolved
├── assignedTo             string   userId / field officer (nullable)
├── assignedAt             timestamp
├── actionTaken            string
└── resolvedAt             timestamp
```

## 8.9 `gapData` *(powers the Opportunity Gap Map)*

```
gapData/{gapId}
├── gapId                  string
├── location
│   ├── state              string
│   ├── district           string
│   ├── block              string
│   ├── latitude           number   block centroid, for the map
│   └── longitude          number
├── courseId               string
├── demandCount            number   people wanting this course here
├── centreCapacity         number   available training capacity here
├── gapType                string   no-centre / centre-full /
│                                   no-local-jobs / met
├── trainedCount           number
├── placedCount            number
├── unplacedCount          number
├── lastCalculated         timestamp
└── severity               string   low / medium / high
```

## 8.10 How the Collections Relate

```
users ──assigned to──> centres ──belongs to──> courses
                          │
                          ▼
beneficiaries ──allotted to──> centres
     │
     ├──> calls           (many calls per beneficiary)
     ├──> followUps       (many follow-ups per beneficiary)
     ├──> attendance      (referenced inside session records)
     └──> adminFlags      (flags raised about them)

gapData ──aggregated from──> beneficiaries + centres + courses
```

## 8.11 Amendments Made During the Foundation Build

SETU runs on the Firebase **Spark (free) plan with no Cloud Functions**, so Part 7 is enforced entirely by Firestore security rules (`firestore.rules`, tested in `tests/firestore.rules.test.ts`). These schema changes make that possible:

| Collection | Change | Why |
|---|---|---|
| `beneficiaries`, `centres`, `gapData` | `location.latitude`, `location.longitude` | Distance-based auto-allotment and the Leaflet Gap Map |
| `users` | Document ID is the Firebase Auth UID; the rules read `role` and `isActive` from it | Custom claims would need a server |
| `beneficiaries` | `activeHandler`, `activeCallId` | The privacy lock: taken in the same batch that accepts a call, released when the report is sent. Identity is readable only while it is held, and editable only while the call is `active` |
| `calls` | `status` (waiting → active → report-review → completed) | Drives the queue, the edit lock and the mandatory report stage |
| `calls` | `assignedTo`, `transferredFromCallId` | Routes a callback case to one resource person, and proves it came from an executive's active call |
| `calls` | `transcript` moved to `calls/{callId}/private/detail` (with `aiContext`, `notes`) | Transcripts can identify the beneficiary, and Firestore rules protect whole documents, not fields |

---

# PART 9 — TECHNOLOGY STACK

## 9.1 The Build Stack — Zero Cost

Every layer below is **free** for a student project and hackathon demo. Nothing here requires a paid subscription or a trial that can expire mid-demo.

| Layer | Technology | Cost | Notes |
|---|---|---|---|
| **Frontend** | React | Free | Three role-based consoles |
| **Backend** | Node.js | Free | API and business logic |
| **Authentication** | Firebase Auth | Free tier | Email/password, role-based access control |
| **Database** | Firebase Firestore | Free tier | Real-time — powers live queues and dashboards |
| **Hosting** | Firebase Hosting | Free tier | Fast deploy |
| **Region** | **asia-south1 (Mumbai)** | — | **Set this — data sovereignty matters for a government project** |
| **Voice AI (STT · TTS · translation)** | **Bhashini** | **Free** | Government platform, 22 Indian languages |
| **Call layer** | **Simulated in-browser voice** | **Free** | Browser mic/speaker; identical pipeline to production |
| **Messaging (SMS/WhatsApp)** | **Simulated in-app** | **Free** | Show the message exactly as the beneficiary would receive it |

## 9.2 Bhashini — The Voice Layer

**Bhashini** (Digital India Bhashini Division, under MeitY) is India's national language AI platform, and it is **genuinely free for developers**: no API fees, no usage limits for qualifying applications, and no proprietary lock-in. It is treated as public digital infrastructure rather than a commercial product.

It provides exactly what SETU needs:

- **Automatic Speech Recognition (ASR)** — speech-to-text in all 22 Indian languages
- **Text-to-Speech (TTS)** — natural-sounding voice output
- **Machine Translation** — between any of the 22 languages
- **Transliteration** — script conversion

**To get started:** register on the **Bhashini ULCA portal** to obtain your `userID` and `ulcaApiKey`.

**Why it matters beyond cost:** Bhashini already powers UMANG, DigiLocker, Common Service Centres and 100+ government applications, and its models draw on AI4Bharat research from IIT Madras. Choosing India's own language stack over a foreign service is a **genuine differentiator with government judges**.

## 9.3 The Call Layer — Simulated, and Why That Is the Right Choice

Real cloud telephony is **not free**:

- **Twilio** — free *trial credit* only, time-limited with a 30-day expiry and trial restrictions (such as only calling pre-verified numbers)
- **Exotel** — credit-based pricing from around ₹9,999 for 5 months, with a 7-day free trial
- **MSG91** — pay-as-you-go from roughly ₹0.25 per SMS

A trial that expires days before the finale is a serious demo risk. So:

**For the hackathon, simulate the call in the browser.** The pipeline is identical to production:

```
Browser microphone  →  Bhashini ASR (speech → text)
                    →  AI profiling & matching logic
                    →  Bhashini TTS (text → speech)
                    →  Browser speaker
```

The judge sees the complete conversation, the profiling, the recommendation, the report — everything. Only the transport differs.

**What to say to judges:**

> *"In production this routes through cloud telephony so a beneficiary calls a toll-free number from any keypad phone. Here we demonstrate the identical voice pipeline in the browser — same speech recognition, same matching, same report."*

This is honest, costs nothing, and cannot break because of a trial expiry.

**Production path (state it, don't build it):** Exotel or MSG91 for telephony and SMS — both Indian providers, which keeps data within Indian jurisdiction and fits the Atmanirbhar framing.

## 9.4 Messaging — Simulated for the Demo

Report delivery by SMS and WhatsApp also costs money per message. For the demo, **render the message in-app exactly as the beneficiary would receive it** — same content, same language, same format. Judges see the outcome; you pay nothing.

## 9.5 Data Sovereignty

Set the Firestore region to **India (asia-south1)**. If a judge asks where citizen data lives:

> *"Data is hosted in the India region, and a production deployment would move to MeitY-empanelled government cloud (NIC/MeghRaj)."*

## 9.6 Build Priority

Build in this order and stop wherever time runs out — each step leaves you with a working demo:

1. Firebase foundation — auth, Firestore, three roles
2. **Admin Console**, including the **Opportunity Gap Map** *(protect time for this — it is the showpiece)*
3. Call Console
4. Resource Person Console
5. **Simulated voice call flow with Bhashini** *(guarantees a live demo)*
6. Sample data so no screen is empty
7. Real telephony — **only** if hours and budget genuinely remain

> **A flawless simulated demo beats a half-working real phone line every single time.**

---

# PART 10 — WHY SETU WINS

## 10.1 What Most Teams Will Build

For a skilling problem statement, the predictable submissions are:

1. A **mobile app or web portal** where users register, fill a profile, and browse courses — *roughly 70% of teams*
2. A **text chatbot** bolted onto that portal
3. A **recommendation engine** driven by a form
4. A **dashboard** counting enrollments
5. Perhaps **multilingual text** — the app translated into a few languages

## 10.2 The Fatal Flaw They All Share

> **Every one of them assumes the beneficiary can read, type, use an app, and owns a smartphone with internet.**

But the entire point of this problem statement is that the target users cannot do those things. So every portal-based solution **rebuilds the exact barrier the problem asks them to remove.**

When a judge asks *"Can an illiterate farmer with a keypad phone actually use this?"* — most teams have no answer.

**SETU passes that test before the pitch even finishes.**

## 10.3 The Ten Reasons SETU Wins

1. **It removes the barrier instead of rebuilding it** — no app, no reading, no typing, no internet, no smartphone. Just a phone call. *This alone separates SETU from ~70% of the field.*

2. **Voice-first in dialect, not translated text** — a person who cannot read gains nothing from a translated app. SETU talks and listens.

3. **The Opportunity Gap Map** — every other team helps individuals; SETU also tells the government *where to invest next*. It reframes the project from "an app" to "a governance system."

4. **Closed-loop outcome tracking to a real job** — others count enrollments; SETU measures placements, attacking the scheme's documented core failure.

5. **The automation funnel proves national scale** — one number answers the scalability question most teams cannot answer at all.

6. **Every real-world case is handled** — dislikes the course, drops out, no local jobs, online-only, no phone. Most demos collapse under the first "what if"; SETU has a designed answer for all of them.

7. **Consent and confidence-flagging show maturity** — handling vulnerable SC-community data responsibly turns a common weakness into a strength.

8. **Indigenous technology choice** — **Bhashini**, India's own national language platform (free, MeitY-built, already powering UMANG and DigiLocker), plus India-region hosting and a stated path to government cloud. Not a foreign API wrapped in a demo.

9. **A massive head start** — roughly 65–70% reuses proven, already-built production code (Firebase, multi-tier RBAC, voice pipeline, admin dashboards, booking/scheduling logic). *While other teams debug login at 3 a.m., SETU's foundation already works.*

10. **A flawless demo beats an ambitious broken one** — and the head start is what makes flawless achievable.

## 10.4 The Winning Pitch — One Line

> **"SETU is a bridge that lets India's most excluded citizens access skilling with nothing but a phone call — and while it guides each person to a job, it quietly shows the government exactly where to build the next training centre and bring the next jobs."**

That dual solve — **individual access plus government planning** — is the unbeatable angle. Lead with it.

---

*End of specification.*
