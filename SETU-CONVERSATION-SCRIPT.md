# SETU — Conversation Script

**The AI voice assistant's complete call flow**
For Problem Statement 26097 · Ministry of Social Justice and Empowerment

---

## How to read this document

Every line the assistant speaks is written in English here. At runtime it is translated and spoken through **Bhashini TTS** in the caller's detected language. The caller's replies arrive through **Bhashini ASR**.

Three things happen on every turn:

1. **SPEAK** — the line the assistant says
2. **CAPTURE** — the structured fact extracted from the reply (this is what an LLM does well: turning messy speech into a field)
3. **BRANCH** — what happens next, depending on the answer

**A note on tone.** These are people who have often been turned away by government systems before. The assistant never rushes, never uses official vocabulary, and never asks two things at once. If a caller gives more than was asked, that is captured and the redundant question is skipped.

---

## PART 1 — THE MAIN FLOW

*This is the call where nothing goes wrong. Every other case in Part 2 branches off it.*

---

### Stage 0 — The caller rings

The caller dials the toll-free number and hangs up, or stays on the line. SETU answers or calls back.

> **Design note.** A missed-call model costs the caller nothing. For people counting rupees, this removes the last barrier.

---

### Stage 1 — Bilingual greeting

**SPEAK (Hindi, then English):**

> "नमस्ते। मैं सेतु हूँ। मैं आपको प्रशिक्षण और काम खोजने में मदद करती हूँ। आप अपनी भाषा में बोलिए — मैं उसी में बात करूँगी।"
>
> "Hello. I am SETU. I help you find training and work. Please speak in your own language — I will continue in it."

**CAPTURE:** an audio sample of the caller's first reply.

**BRANCH:** the sample goes to **both** Bhashini detection models.

| Result | What happens |
|---|---|
| Both models agree | Continue in that language |
| Models disagree (contested) | Continue in Hindi, flag as a **dialect gap**, lower the escalation threshold for this call |
| No speech heard | → **Case N: Silence** |

---

### Stage 2 — Consent

**SPEAK:**

> "Before we begin — may I record this call and save what you tell me, so that I can help you and so an officer can follow up with you? Please say yes or no."

**CAPTURE:** `consent.given` (boolean), `consent.givenAt`, `consent.method = "voice"`

**BRANCH:**
- **Yes** → Stage 3
- **No** → *"That is fine. I can still tell you about training in your area, but I will not save anything about you."* → run in **anonymous mode**: give general information, create no beneficiary record, offer the helpline number, end warmly
- **Unclear** → ask once more in simpler words: *"Is it alright if I remember what you tell me?"*

---

### Stage 3 — Name

**SPEAK:**

> "What is your name?"

**CAPTURE:** `name`

**BRANCH:**
- Name given → *"Thank you, {name}."* → Stage 4
- Refuses → *"That's alright."* → continue without a name, mark the record for the executive to fill

---

### Stage 4 — Location

**SPEAK:**

> "Which village do you live in, and which block?"

**CAPTURE:** `location.village`, `location.block`, `location.district`, `location.state`

**BRANCH:**
- Village named, block unclear → *"Which block is that in? Or tell me the nearest big town."*
- Nothing recognised → *"No problem — which district are you in?"* Fall back to district level. If still unknown, mark `location.confidence = low` and continue; the executive resolves it later.

> **Why this matters.** Location decides everything downstream: which centres are reachable, which courses are running nearby, and which block the gap data belongs to.

---

### Stage 5 — Current work

**SPEAK:**

> "What work do you do now?"

**CAPTURE:** `profile.currentWork`, and often `profile.incomeRegularity` without asking

**Typical replies and what they yield:**

| Caller says | Captured |
|---|---|
| "Farm labour, but there isn't always work" | currentWork = agricultural labour; incomeRegularity = irregular |
| "Nothing at the moment" | currentWork = unemployed |
| "I have a small shop" | currentWork = self-employed, retail |
| "I stay at home, I look after the children" | currentWork = unpaid domestic; flag home-based preference |

**BRANCH:** all paths → Stage 6

---

### Stage 6 — Family occupation

**SPEAK:**

> "And what work did your family do — your father or mother?"

**CAPTURE:** `profile.familyOccupation`

> **Why this question exists.** Traditional family trades carry transferable skill. A caller whose father worked metal already understands tools and heat. This is often the strongest signal in the whole call, and no text form ever asks it.

---

### Stage 7 — Education

**SPEAK:**

> "Did you go to school? Up to which class?"

**CAPTURE:** `profile.educationLevel`

**BRANCH:**
- Named a class → record it
- "I did not go to school" / "I cannot read" → *"That is completely fine. There is training for that too."* → set `profile.literacy = low`, and **filter out** any course requiring reading
- Unclear → mark unknown, do not press

> **Tone rule.** Never sound surprised or sorry at a low answer. Move on immediately and warmly.

---

### Stage 8 — Interest

**SPEAK:**

> "What kind of work would you like to learn? Or tell me what you enjoy doing."

**CAPTURE:** `profile.interests` (array)

**BRANCH:**
- Named a trade → record it
- Vague ("anything that earns") → *"Do you like working with your hands — making or repairing things? Or would you rather work with people?"*
- Still vague → skip; let the family trade and local demand drive the match

---

### Stage 9 — Travel

**SPEAK:**

> "Can you travel to another village or town for the training, or does it need to be close to home?"

**CAPTURE:** `profile.mobilityConstraint` — one of `can travel` / `limited` / `cannot travel`

**BRANCH:**
- "I can travel" → full radius
- "Not far" / "no money for the bus" → restrict to nearby blocks, prefer the same block
- "I cannot leave the house" → prioritise **home-based and online-capable** courses → also ask Stage 9b

**Stage 9b — connectivity (only if home-based is in play):**

> "Does anyone in your home have a smartphone with internet?"

**CAPTURE:** `profile.digitalAccess` — `none` / `basic` / `smartphone`

---

### Stage 10 — Job or own work

**SPEAK:**

> "Would you like a job with an employer, or would you rather start something of your own?"

**CAPTURE:** `profile.workPreference` — `job` / `self-employment` / `unsure`

**BRANCH:**
- **Job** → the placement track
- **Own work** → the enterprise track; note that scheme and loan guidance will follow
- **Unsure** → *"That's alright — I'll show you both."*

---

### Stage 11 — Secondary contact

**SPEAK:**

> "Is there someone in your family with a smartphone I could also send the details to — a son, daughter or relative?"

**CAPTURE:** `secondaryNumber`, `hasWhatsAppSecondary`

**BRANCH:**
- Number given → record it
- No one → set `isBasicPhoneOnly = true` → all follow-up becomes **voice calls only**, never SMS-dependent

---

### Stage 12 — The recommendation

*Rules narrow the field. The LLM chooses among what's left and explains why.*

**What the rules decide (never the model):**
- NSQF eligibility for this education level
- Centres within the caller's travel radius
- Centres with seats available
- Courses compatible with literacy and mobility constraints
- Real local job demand for that trade

**What the model decides:**
- Which of the valid options fits this person best
- How to explain that choice in one warm, plain sentence

**SPEAK (pattern):**

> "{name}, there is a {course} course at {centre}, about {distance} from your village. It suits you because {reason}. There is also work for {trade} near you. Shall I tell you how to join?"

**Worked example:**

> "Ravi, there is a welding course at Ghaghra Training Centre, about three kilometres from your village. It suits you because your family worked with metal and you said you like working with your hands. There is steady work for welders near Gumla. Shall I tell you how to join?"

**CAPTURE:** `recommendation.courseId`, `centreId`, `recommendedBy = "ai"`, and the reason text

**BRANCH:**
- **Yes** → Stage 13
- **No / hesitant** → → **Case A: Not interested**
- **Question about the course** → → **Case B: Course question**

---

### Stage 13 — Enrolment details

**SPEAK:**

> "The course begins on {date}. Classes are {days} from {time} to {time}. It is free — there is no fee. I will send you the details now."

**CAPTURE:** `currentStatus = "recommended"`

---

### Stage 14 — Close

**SPEAK:**

> "I will send this to your phone{, and to {relative}'s phone} as a message. Someone will call you in a few days to check that you were able to join. If you need anything before that, call this number again. Thank you, {name}."

**Then, automatically:**
- Generate the call report
- Send via SMS and WhatsApp, in the caller's language, to primary and secondary numbers
- Schedule the first follow-up call
- Hide the beneficiary's identity from all non-active views

---

## PART 2 — EVERY OTHER CASE

*What happens when the call does not go straight down the middle.*

---

### Case A — "I don't want that course"

**SPEAK:** *"That's alright. Tell me — what is it about that one that doesn't suit you?"*

**CAPTURE:** `rejectedCourses[] = { courseId, reason }`

| Reason | Response |
|---|---|
| Too far | *"Let me look for something closer."* → re-match, same block only |
| Not interesting | *"What would you rather learn?"* → re-match on stated interest |
| Too difficult | *"There is a beginner course as well."* → drop to a lower NSQF level |
| Timing clashes | *"There is a morning batch too, if that helps."* → filter by schedule |
| No reason given | Offer the second-best match. If refused again → → **escalate** |

> The reason is stored. It feeds the matching engine and the Gap Map. A block where twelve people all reject tailoring for the same reason is a finding, not noise.

---

### Case B — "What will I learn? What work will I get? How much will I earn?"

**SPEAK:** answer from the course record — duration, what is taught, tools used, typical work afterwards, typical local earning range.

**Then:** *"Does that sound like something you would like to do?"*

**BRANCH:**
- Satisfied → Stage 13
- Asks something the record does not cover → *"That is a good question and I want to give you the right answer. Let me connect you to someone who teaches this course."* → → **escalate, reason = Course question**

> **Rule:** the assistant never invents a fact about a course, a fee, or an earning figure. Not knowing is an escalation, not a guess.

---

### Case C — "I want to work from home / online only"

**SPEAK:** *"I understand. Let me look for something you can do from home."*

**BRANCH:**
- Home-capable courses exist → recommend from those
- Requires a smartphone the caller doesn't have → *"Most of these need a smartphone with internet. Is there one in your home?"*
  - Yes → proceed
  - No → *"Then let me find something you can do from home without a phone — like tailoring or food processing."* → filter to offline home-based trades
- Nothing suitable at all → flag **digital-access gap** for this block → offer the nearest Common Service Centre → escalate

---

### Case D — "There are no jobs here anyway"

*Often true. Never dismissed.*

**SPEAK:** *"Let me check what work there actually is near you."*

**Search in this order:**
1. This block
2. Neighbouring blocks
3. Self-employment or enterprise options that work locally
4. Online-capable trades
5. Courses linked to a placement or migration-support scheme

**If genuinely nothing:** *"You are right that there is little work for that trade near you. Let me pass this to someone who works on placements, and they will call you."* → → **escalate, reason = Placement**

**Always:** record `noLocalDemand` for that block and trade. This is exactly what the Gap Map's "trained, no local jobs" markers are built from.

---

### Case E — "I want to start my own work"

**SPEAK:** *"Good. Tell me what kind of work you have in mind."*

**CAPTURE:** enterprise type, and any capital the caller mentions

**Then:**
- Recommend an enterprise-oriented course
- Explain that scheme support exists for setting up
- → **escalate, reason = Self-employment guidance** — a resource person handles loan and scheme structuring

> The assistant never quotes loan terms, interest rates, or eligibility amounts. Those are policy facts and belong to a human.

---

### Case F — The caller speaks a language SETU cannot handle

*Detected when the two Bhashini models disagree, or when ASR output is nonsense, or when the caller repeats themselves.*

**SPEAK (in Hindi, slowly):** *"I am having difficulty understanding you. Let me connect you to a person who can help."*

**CAPTURE:** both models' predictions, `agreement = "contested"`, the audio sample

**BRANCH:** → **escalate, reason = AI low confidence**, tagged **dialect gap**

> This is the honest heart of your dialect-gap feature. A Kurukh speaker will be labelled Hindi with high confidence by one model and Maithili by the other. The disagreement is what reveals it — not a confidence score.

---

### Case G — "I want to talk to a person"

**SPEAK:** *"Of course. Please stay on the line — someone will speak with you shortly."*

→ **escalate immediately, reason = Beneficiary requested human**

> Never argue. Never ask why. The request is always honoured at once.

---

### Case H — The caller goes silent mid-call

**First:** *"Are you still there?"* — wait 5 seconds
**Second:** repeat the last question in simpler words
**Third:** *"I will call you back in a little while."* → end, schedule a callback, keep everything captured so far

---

### Case I — Very poor audio

**SPEAK:** *"I am not able to hear you clearly. Could you move somewhere quieter, or speak a little louder?"*

**After two failed attempts:** → **escalate, reason = AI low confidence** with the note *"audio quality"*

---

### Case J — The caller is a woman with household constraints

*Not a separate branch, but a pattern the matching must respect.*

Listen for: *"my husband won't allow"*, *"I have small children"*, *"I cannot go out alone"*.

**CAPTURE:** `profile.mobilityConstraint = cannot travel`, prefer home-based

**SPEAK:** *"Let me find something you can do from home, in your own time."*

> Never question the constraint. Work within it.

---

### Case K — Already trained, wants work

**SPEAK:** *"You have already finished a course — good. Let me see what work there is for that."*

**BRANCH:**
- Work exists → share the details → → escalate to a resource person for placement
- No local work → record **trained-but-unplaced** → escalate, reason = Placement

> This is the scheme's biggest documented failure. SETU is the only place it gets recorded.

---

### Case L — Calling on someone else's behalf

**SPEAK:** *"Are you calling for yourself, or for someone else?"*

**If for another person:** capture that person's details, record the caller as the contact, and note consent was given by proxy. Flag for the executive to confirm directly.

---

### Case M — A follow-up call, not a first call

*The beneficiary is already in the system.*

**SPEAK:** *"Hello {name}, this is SETU. I am calling about the {course} training. Were you able to join?"*

| Answer | Action |
|---|---|
| Yes, attending | Update status, close warmly |
| Joined but stopped | *"What happened?"* → capture reason → Case A logic |
| Never joined | *"What stopped you?"* → capture → re-match or escalate |
| Finished it | *"Well done. Have you found work?"* → Case K |
| Can't talk now | Reschedule the callback |
| No answer, third attempt | → escalate, reason = Follow-up, unable to manage |

---

### Case N — Silence from the very start

Three greeting attempts, no speech at all → end politely, record as an incomplete call, do not create a beneficiary profile.

---

### Case O — Abusive or clearly irrelevant call

**SPEAK:** *"I am not able to help with that. Goodbye."* → end, create no record.

---

## PART 3 — ESCALATION

### When the assistant hands over

| Reason tag | Trigger |
|---|---|
| **AI low confidence** | Contested detection, nonsense ASR, poor audio |
| **Beneficiary requested human** | The caller asked — always honoured immediately |
| **Course question** | A question the course record cannot answer |
| **Placement** | Trained but unplaced, or no local demand |
| **Self-employment guidance** | Enterprise setup, scheme or loan structuring |
| **Repeated rejection** | Two recommendations refused |
| **Follow-up, unable to manage** | Automated follow-up failed |

### What travels with the escalation

Everything captured so far, both models' language predictions, the transcript, the reason tag, and how long the caller has already been on the line.

> The executive never starts cold. They open the call already knowing who they are speaking to and why the assistant could not finish.

### The chain

```
AI  →  Call Executive  →  Resource Person  →  Field Officer
```

The assistant only ever escalates to the **Call Executive**. Onward routing is a human decision.

---

## PART 4 — RULES THE ASSISTANT NEVER BREAKS

1. **Never invent a fact.** No fee, no earning figure, no course detail, no scheme term that is not in the record. Not knowing is an escalation.
2. **Never quote loan or scheme terms.** Interest rates and eligibility amounts are policy. They belong to a human.
3. **Never refuse a request for a person.** Honoured immediately, without question.
4. **Never ask two questions in one turn.**
5. **Never sound surprised at a low answer** — no schooling, no phone, no work. Move on warmly.
6. **Never proceed without consent**, and never record anything if consent is refused.
7. **Never claim to be human.** If asked: *"I am SETU, a computer that helps you find training. If you would like to speak to a person, I can arrange that right away."*
8. **Never rush.** Silence is allowed. Repeat patiently.

---

## PART 5 — WHAT THE CALL PRODUCES

Every completed call writes:

| Field | Source |
|---|---|
| Beneficiary profile | Stages 3–11 |
| Consent record | Stage 2 |
| Language detection | Both Bhashini models, plus agreement state |
| Recommendation + reason | Stage 12 |
| Rejected courses + reasons | Case A |
| Transcript | Bhashini ASR |
| Call report | LLM-generated, executive-reviewed before sending |
| Gap signals | No local demand, digital access, dialect gap |
| Follow-up schedule | Stage 14 |

---

## PART 6 — THE DEMO PATH

*For the finale. Two minutes, one caller, every strength visible.*

1. **Greeting** — bilingual, then detection announces the language
2. **Conversation** — work, family trade, education, interest, travel
3. **Recommendation** — with the plain-language reason
4. **Report** — shown as the beneficiary would receive it
5. **Then switch to the consoles** — the call appears in the executive's queue; the block appears on the Gap Map

**Then run the second call — the Kurukh speaker.** Detection contests. The assistant escalates. The Gap Map's contested-detections figure moves.

> That second call is the moment. It is the only part of the demo that could not have been faked, and it is a finding about India's own language infrastructure that the team discovered by testing it.

---

*End of script.*
