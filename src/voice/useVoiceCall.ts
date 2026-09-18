/**
 * Runs one simulated call: speaks, listens, advances the script's stages, and writes the
 * result where the consoles will find it.
 *
 * Reliability comes before features here. Every Bhashini call can fail, and each failure
 * has a defined fallback — cached audio, then live TTS, then text on screen; ASR, then
 * typed input. Nothing in this hook throws during a call.
 */

import { useCallback, useRef, useState } from 'react'
import { bhashiniConfigFromEnv } from '../lib/env'
import {
  combine,
  createBhashiniDetector,
  languageNameFor,
  PRIMARY_SERVICE_ID,
  SECONDARY_SERVICE_ID,
  type LanguageDetection,
} from '../lib/languageDetection'
import { addCompletedCall, addQueuedCall } from '../data/liveCalls'
import { queueEscalatedCall, recordAiCall, recordContestedDetection } from '../data/actions'
import { gapForBlock } from '../data/jharkhandGaps'
import { registerLiveBeneficiary, type CompletedCall, type QueuedCall, type ReasonTag } from '../data/jharkhandCalls'
import type { SystemCall } from '../data/adminConsole'
import type { Beneficiary } from '../data/jharkhandBeneficiaries'
import { blobToWavBase64, play, playCached, startRecording, stopSpeaking, type Recorder } from './audio'
import { synthesise, transcribe } from './bhashini'
import {
  buildRecommendation,
  courseAnswer,
  enrolmentLine,
  extractEducation,
  extractLocation,
  extractMobility,
  extractName,
  extractPhone,
  extractPreference,
  extractTrade,
  extractWork,
  initialState,
  LINES,
  recommendationLine,
  understand,
  type CallState,
  type EscalationReason,
  type StageId,
} from './script'

export type Phase = 'idle' | 'speaking' | 'listening' | 'thinking' | 'ended'

export interface VoiceStatus {
  /** Set when something degraded but the call carried on. */
  notice: string | null
  micError: 'denied' | 'unavailable' | null
  /** True when a spoken line had to be shown as text instead. */
  textOnly: boolean
}

const ESCALATION_TAG: Record<EscalationReason, ReasonTag> = {
  'ai-low-confidence': 'ai-low-confidence',
  'beneficiary-requested-human': 'beneficiary-requested-human',
  'course-question': 'course-question',
  placement: 'placement',
  'self-employment': 'self-employment',
  'repeated-rejection': 'course-question',
}

/**
 * The row the Admin console's Calls section reads, for a call the AI line just handled.
 *
 * Built here rather than derived later because only this hook knows what actually
 * happened: what was captured, whether it was escalated and why, and which two answers
 * the detection models gave.
 */
function aiCallRecord(
  beneficiaryId: string,
  person: Beneficiary,
  final: CallState,
  detection: LanguageDetection,
  seconds: number,
  outcome: 'escalated' | 'recommended',
): SystemCall {
  return {
    callId: `ai-${beneficiaryId}`,
    handler: 'ai',
    // Null is the point: nobody handled it.
    handlerName: null,
    beneficiaryId,
    beneficiaryName: person.name,
    district: person.district,
    block: person.block,
    whenLabel: nowLabel(),
    daysAgo: 0,
    durationSeconds: seconds,
    detection,
    summary:
      outcome === 'escalated'
        ? `Live voice call, handed to an executive. ${final.escalation?.note ?? ''}`.trim()
        : `Live voice call handled end to end. ${
            final.recommendation ? `Recommended ${final.recommendation.course.course}.` : 'No course matched.'
          }`,
    aiOutcome: outcome === 'escalated' ? 'escalated' : 'fully-handled',
    escalationReason: final.escalation?.note,
    confidence: detection.confidence,
  }
}

/**
 * Counts a contested detection against the caller's block.
 *
 * The two models disagreeing is the dialect-gap signal — not low confidence, which an
 * unsupported language does not produce. A block with no gap record is simply not
 * counted: inventing one would put a marker on the map that no data stands behind.
 */
async function countContestedDetection(block: string, course?: string): Promise<void> {
  const gap = gapForBlock(block, course)
  if (!gap) return
  const result = await recordContestedDetection(gap.gapId)
  if (!result.ok) console.warn('Contested detection not counted on the map:', result.error)
}

function nowLabel(): string {
  const now = new Date()
  return `${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`
}

/** A detection stand-in for typed input, marked unconfirmed rather than invented. */
function typedDetection(text: string): LanguageDetection {
  const devanagari = /[ऀ-ॿ]/.test(text)
  const langCode = devanagari ? 'hi' : 'en'
  return combine(
    { serviceId: PRIMARY_SERVICE_ID, langCode, scriptCode: devanagari ? 'deva' : 'latn', langScore: 0 },
    null,
    'simulated',
  )
}

export interface VoiceCallOptions {
  /**
   * Forces the first detection to come back contested, so Case F can be rehearsed
   * without a Kurukh speaker in the room. The values are the ones the two models
   * actually returned for Magahi speech in testing — Hindi 0.92 against Maithili 0.98.
   * It is off unless ?rehearse=contested is in the URL, and the page says so on screen.
   */
  rehearseContested?: boolean
}

export function useVoiceCall(options: VoiceCallOptions = {}) {
  const config = bhashiniConfigFromEnv()
  const [state, setStateRaw] = useState<CallState>(initialState)
  const [phase, setPhase] = useState<Phase>('idle')
  const [detection, setDetection] = useState<LanguageDetection | null>(null)
  const [status, setStatus] = useState<VoiceStatus>({ notice: null, micError: null, textOnly: false })
  const [elapsed, setElapsed] = useState(0)

  const recorder = useRef<Recorder | null>(null)
  const startedAt = useRef<number>(0)
  /** True while a reply is being handled, so nothing can advance the call twice. */
  const busy = useRef(false)
  // The async turn handlers need the latest state, so the ref is the source of truth and
  // React state mirrors it. Writing both together keeps them from drifting.
  const stateRef = useRef<CallState>(initialState())

  const commit = useCallback((next: CallState | ((current: CallState) => CallState)) => {
    const value = typeof next === 'function' ? next(stateRef.current) : next
    stateRef.current = value
    setStateRaw(value)
  }, [])

  /** The language SETU speaks in: the detected one, or Hindi where it cannot. */
  const spoken: 'hi' | 'en' = detection?.languageCode === 'en' ? 'en' : 'hi'

  const addTurn = useCallback(
    (speaker: 'setu' | 'caller', text: string, stage: StageId) => {
      commit((current) => ({ ...current, turns: [...current.turns, { speaker, text, stage }] }))
    },
    [commit],
  )

  /**
   * Says a line. Pre-generated audio first so no turn waits on the network; live TTS for
   * anything dynamic; and if both fail the line is still shown and the call continues.
   */
  const speak = useCallback(
    async (text: string, cacheId?: string) => {
      setPhase('speaking')
      const langCode = detection?.languageCode ?? 'hi'
      let spokenAloud = false

      if (cacheId) {
        spokenAloud = await playCached(`/voice/${langCode}/${cacheId}.wav`)
        if (!spokenAloud && langCode !== 'hi') spokenAloud = await playCached(`/voice/hi/${cacheId}.wav`)
      }

      if (!spokenAloud && config.inferenceKey) {
        const audio = await synthesise(text, langCode, config.inferenceKey)
        if (audio) {
          await play(audio)
          spokenAloud = true
        }
      }

      if (!spokenAloud) setStatus((current) => ({ ...current, textOnly: true }))
      setPhase('idle')
    },
    [config.inferenceKey, detection?.languageCode],
  )

  /* ─────────────── writing the outcome where the consoles will see it ─────────────── */

  const finish = useCallback(
    (final: CallState, finalDetection: LanguageDetection) => {
      const id = `SETU-JH-VOICE-${String(Date.now()).slice(-5)}`
      const transcript = final.turns.map((turn) => ({
        speaker: turn.speaker,
        text: turn.text,
        lang: finalDetection.languageCode,
      }))
      const block = final.profile.block ?? 'Ghaghra'
      const district = final.profile.district ?? 'Gumla'
      const seconds = Math.max(30, Math.round((Date.now() - startedAt.current) / 1000))

      if (final.escalation) {
        // The executive never starts cold: everything captured travels with the call.
        const person: Beneficiary = {
          ...({} as Beneficiary),
          beneficiaryId: id,
          name: final.profile.name ?? 'Caller (name not given)',
          age: 0,
          gender: 'F',
          primaryNumber: '+91 00000 00000',
          secondaryNumber: final.profile.secondaryNumber,
          preferredLanguage: finalDetection.languageName,
          district,
          block,
          village: final.profile.village ?? '—',
          educationLevel: final.profile.schoolYears === null ? 'Not recorded' : `Class ${final.profile.schoolYears}`,
          currentWork: final.profile.currentWork ?? 'Not recorded',
          interests: final.profile.interests,
          course: final.recommendation?.course.course ?? 'Not yet matched',
          centre: final.recommendation?.centreName ?? null,
          trainingStatus: 'new',
          employmentStatus: 'in-training',
          lastContactDays: 0,
          aiFlags: final.dialectGap ? ['dialect gap'] : [],
          isStalled: false,
          hasDialectGap: final.dialectGap,
          attendance: null,
          calls: [],
          journey: [],
          outcome: 'Live call, escalated to an executive',
        }
        registerLiveBeneficiary(person)

        const queued: QueuedCall = {
          callId: `voice-${Date.now()}`,
          beneficiaryId: id,
          district,
          block,
          detection: finalDetection,
          reasonTag: ESCALATION_TAG[final.escalation.reason],
          reasonDetail: final.escalation.note,
          waitedSeconds: 0,
          ai: {
            callNumber: 1,
            whenLabel: nowLabel(),
            summary: `Live voice call. ${final.escalation.note}`,
            recommendedCourse: final.recommendation?.course.course ?? 'Not matched',
            recommendedCentre: final.recommendation?.centreName ?? '—',
            matchNote: final.dialectGap
              ? 'Detection contested between the two models — dialect gap'
              : 'Captured by the AI before handing over',
            confidence: finalDetection.confidence,
            transcript,
            priorFlags: final.dialectGap ? ['dialect gap'] : [],
          },
          draftDiscussion: final.turns
            .filter((turn) => turn.speaker === 'caller')
            .map((turn) => turn.text)
            .join(' · '),
          draftActions: ['Handed over by the AI', final.escalation.note],
          draftOutcome: 'transferred-resource-person',
          draftCourse: final.recommendation?.course.course ?? 'Not matched',
        }
        addQueuedCall(queued, finalDetection, {
          block,
          district,
          course: final.recommendation?.course.course ?? 'Not matched',
          noLocalDemand: final.noLocalDemand,
        })

        // The database is where this call actually lives; the in-memory store above is
        // what lets the already-mounted console show it without waiting for a reload.
        // Failures are recorded rather than thrown: the caller has hung up, and losing
        // the demo call to an unhandled rejection would be worse than a console warning.
        void recordAiCall(person, aiCallRecord(id, person, final, finalDetection, seconds, 'escalated'), null).then(
          (result) => {
            if (!result.ok) console.warn('AI call not written:', result.error)
          },
        )
        void queueEscalatedCall(queued, id).then((result) => {
          if (!result.ok) console.warn('Escalated call not queued in Firestore:', result.error)
        })
        if (final.dialectGap) void countContestedDetection(block, final.recommendation?.course.course)
        return
      }

      const completed: CompletedCall = {
        callId: `voice-done-${Date.now()}`,
        ref: `AI-${String(Date.now()).slice(-4)}`,
        detection: finalDetection,
        whenLabel: nowLabel(),
        daysAgo: 0,
        durationSeconds: seconds,
        discussion: `Voice call handled end to end by the AI. ${final.profile.currentWork ?? 'Work not recorded'}; family trade ${final.profile.familyOccupation ?? 'not recorded'}.`,
        course: final.recommendation
          ? `${final.recommendation.course.course} · ${final.recommendation.centreName}`
          : 'No course matched',
        actions: [
          'Profile captured by voice',
          final.recommendation ? `Recommended ${final.recommendation.course.course}` : 'No match available',
          'Details sent by SMS and WhatsApp',
        ],
        outcome: 'enrolled',
      }
      addCompletedCall(completed, finalDetection, {
        block,
        district,
        course: final.recommendation?.course.course ?? 'Not matched',
        noLocalDemand: final.noLocalDemand,
      })

      const person: Beneficiary = {
        ...({} as Beneficiary),
        beneficiaryId: id,
        name: final.profile.name ?? 'Caller (name not given)',
        age: 0,
        gender: 'F',
        primaryNumber: '+91 00000 00000',
        secondaryNumber: final.profile.secondaryNumber,
        preferredLanguage: finalDetection.languageName,
        district,
        block,
        village: final.profile.village ?? '—',
        educationLevel: final.profile.schoolYears === null ? 'Not recorded' : `Class ${final.profile.schoolYears}`,
        currentWork: final.profile.currentWork ?? 'Not recorded',
        interests: final.profile.interests,
        course: final.recommendation?.course.course ?? 'Not yet matched',
        centre: final.recommendation?.centreName ?? null,
        trainingStatus: final.recommendation ? 'recommended' : 'new',
        employmentStatus: 'in-training',
        lastContactDays: 0,
        aiFlags: [],
        isStalled: false,
        hasDialectGap: false,
        attendance: null,
        calls: [],
        journey: [],
        outcome: 'Handled end to end by the AI line',
      }
      registerLiveBeneficiary(person)
      void recordAiCall(
        person,
        aiCallRecord(id, person, final, finalDetection, seconds, 'recommended'),
        completed,
      ).then((result) => {
        if (!result.ok) console.warn('AI call not written:', result.error)
      })
    },
    [],
  )

  /* ─────────────── the stage machine ─────────────── */

  /**
   * Hands the call to an executive. The detection is passed in rather than read from
   * state: it is often set in the same tick as the escalation, and a stale read here
   * would file the call under the wrong language.
   */
  const escalate = useCallback(
    async (
      reason: EscalationReason,
      note: string,
      line: { text: string; cacheId?: string },
      withDetection?: LanguageDetection,
    ) => {
      addTurn('setu', line.text, 'done')
      const next: CallState = {
        ...stateRef.current,
        escalation: { reason, note },
        outcome: 'escalated',
        stage: 'done',
      }
      commit(next)
      await speak(line.text, line.cacheId)
      finish(next, withDetection ?? detection ?? typedDetection(''))
      setPhase('ended')
    },
    [addTurn, commit, detection, finish, speak],
  )

  const handleReply = useCallback(
    async (text: string, activeDetection: LanguageDetection) => {
      const current = stateRef.current
      addTurn('caller', text, current.stage)
      const reading = understand(text)
      const language = activeDetection.languageCode === 'en' ? 'en' : 'hi'

      // Rule 3: a request for a person is honoured at once, whatever stage we are at.
      if (reading.intent === 'wants-human') {
        await escalate('beneficiary-requested-human', 'Caller asked to speak to a person', {
          text: LINES.handOver![language],
          cacheId: 'handOver',
        })
        return
      }
      // Rule 7: never claim to be human.
      if (reading.intent === 'asks-if-human') {
        addTurn('setu', LINES.notHuman![language], current.stage)
        await speak(LINES.notHuman![language])
        return
      }

      const profile = { ...current.profile }
      let nextStage: StageId = current.stage
      const say: { text: string; cacheId?: string }[] = []

      switch (current.stage) {
        case 'greeting': {
          nextStage = 'consent'
          say.push({ text: LINES.consent![language], cacheId: 'consent' })
          break
        }
        case 'consent': {
          if (reading.intent === 'yes') {
            profile.consent = true
            nextStage = 'name'
            say.push({ text: LINES.name![language], cacheId: 'name' })
          } else if (reading.intent === 'no') {
            // Anonymous mode: no record is created, general help only.
            profile.consent = false
            profile.anonymous = true
            nextStage = 'done'
            say.push({ text: LINES.consentRefused![language] })
            commit((latest) => ({ ...latest, profile, stage: 'done', outcome: 'ended' }))
            for (const line of say) {
              addTurn('setu', line.text, 'done')
              await speak(line.text, line.cacheId)
            }
            setPhase('ended')
            return
          } else {
            say.push({ text: LINES.consentUnclear![language] })
          }
          break
        }
        case 'name': {
          profile.name = extractName(text)
          nextStage = 'location'
          if (!profile.name) say.push({ text: LINES.nameRefused![language] })
          say.push({ text: LINES.location![language], cacheId: 'location' })
          break
        }
        case 'location': {
          const place = extractLocation(text)
          profile.village = place.village ?? profile.village
          profile.block = place.block ?? profile.block
          profile.district = place.district ?? profile.district
          if (!profile.block && !profile.district) {
            say.push({ text: LINES.locationRetry![language] })
          } else {
            nextStage = 'work'
            say.push({ text: LINES.work![language], cacheId: 'work' })
          }
          break
        }
        case 'work': {
          profile.currentWork = extractWork(text) ?? text.slice(0, 60)
          nextStage = 'family'
          say.push({ text: LINES.family![language], cacheId: 'family' })
          break
        }
        case 'family': {
          profile.familyOccupation = text.slice(0, 60)
          profile.familyTrade = extractTrade(text)
          nextStage = 'education'
          say.push({ text: LINES.education![language], cacheId: 'education' })
          break
        }
        case 'education': {
          const education = extractEducation(text)
          profile.schoolYears = education.years
          profile.literacy = education.literacy
          // Tone rule: never sound surprised at a low answer.
          if (education.literacy === 'low') say.push({ text: LINES.educationNone![language] })
          nextStage = 'interest'
          say.push({ text: LINES.interest![language], cacheId: 'interest' })
          break
        }
        case 'interest': {
          const trade = extractTrade(text)
          if (trade) profile.interests = [...profile.interests, trade]
          nextStage = 'travel'
          if (!trade && current.unclear === 0) {
            say.push({ text: LINES.interestProbe![language] })
            nextStage = 'interest'
          } else {
            say.push({ text: LINES.travel![language], cacheId: 'travel' })
          }
          break
        }
        case 'travel': {
          profile.mobility = extractMobility(text)
          if (profile.mobility === 'cannot-travel') {
            nextStage = 'connectivity'
            say.push({ text: LINES.connectivity![language], cacheId: 'connectivity' })
          } else {
            nextStage = 'preference'
            say.push({ text: LINES.preference![language], cacheId: 'preference' })
          }
          break
        }
        case 'connectivity': {
          profile.hasSmartphone = reading.intent === 'yes'
          nextStage = 'preference'
          say.push({ text: LINES.preference![language], cacheId: 'preference' })
          break
        }
        case 'preference': {
          profile.workPreference = extractPreference(text)
          if (profile.workPreference === 'unsure') say.push({ text: LINES.preferenceUnsure![language] })
          nextStage = 'secondary'
          say.push({ text: LINES.secondary![language], cacheId: 'secondary' })
          break
        }
        case 'secondary': {
          profile.secondaryNumber = extractPhone(text)
          profile.isBasicPhoneOnly = profile.secondaryNumber === null
          const match = buildRecommendation(profile)
          if (!match) {
            await escalate(
              'placement',
              'No course within reach matched this caller',
              { text: LINES.noJobs![language] },
              activeDetection,
            )
            return
          }
          nextStage = 'recommendation'
          say.push({ text: recommendationLine(match, profile, language) })
          commit((latest) => ({ ...latest, profile, stage: nextStage, recommendation: match }))
          for (const line of say) {
            addTurn('setu', line.text, nextStage)
            await speak(line.text, line.cacheId)
          }
          return
        }
        case 'recommendation': {
          if (reading.intent === 'course-question') {
            // Case B: answer from the record, or escalate. Never invent.
            const answer = current.recommendation
              ? courseAnswer(current.recommendation.course.course, text, language)
              : null
            if (answer) {
              addTurn('setu', answer, 'recommendation')
              await speak(answer)
              return
            }
            await escalate(
              'course-question',
              'Question the course record does not answer',
              { text: LINES.courseQuestion![language], cacheId: 'courseQuestion' },
              activeDetection,
            )
            return
          }
          if (reading.intent === 'no-jobs') {
            await escalate(
              'placement',
              'Caller reports no local work for this trade',
              { text: LINES.noJobs![language] },
              activeDetection,
            )
            return
          }
          if (reading.intent === 'own-work') {
            await escalate(
              'self-employment',
              'Caller wants to start their own work',
              { text: LINES.ownWork![language] },
              activeDetection,
            )
            return
          }
          if (reading.intent === 'no') {
            // Case A: one re-match, then escalate on a second refusal.
            const rejected = [...current.rejected, { course: current.recommendation?.course.course ?? '', reason: text }]
            if (rejected.length >= 2) {
              await escalate(
                'repeated-rejection',
                'Two recommendations refused',
                { text: LINES.handOver![language], cacheId: 'handOver' },
                activeDetection,
              )
              return
            }
            const retry = buildRecommendation({ ...profile, interests: [] })
            commit((latest) => ({ ...latest, rejected, recommendation: retry }))
            if (retry) {
              const line = recommendationLine(retry, profile, language)
              addTurn('setu', line, 'recommendation')
              await speak(line)
            }
            return
          }
          nextStage = 'enrolment'
          if (current.recommendation) say.push({ text: enrolmentLine(current.recommendation, language) })
          break
        }
        case 'enrolment': {
          nextStage = 'close'
          break
        }
        default:
          break
      }

      commit((latest) => ({ ...latest, profile, stage: nextStage, unclear: 0 }))
      for (const line of say) {
        addTurn('setu', line.text, nextStage)
        await speak(line.text, line.cacheId)
      }

      // Stage 14 closes the call and writes everything the consoles need.
      if (nextStage === 'close') {
        const closing =
          language === 'hi'
            ? `मैं यह आपके फ़ोन पर संदेश के रूप में भेज रही हूँ। कुछ दिनों में कोई आपको फ़ोन करके पूछेगा कि आप जुड़ पाए या नहीं। धन्यवाद${profile.name ? ', ' + profile.name : ''}।`
            : `I will send this to your phone as a message. Someone will call you in a few days to check that you were able to join. Thank you${profile.name ? ', ' + profile.name : ''}.`
        addTurn('setu', closing, 'done')
        await speak(closing)
        const final: CallState = { ...stateRef.current, stage: 'done', outcome: 'completed' }
        commit(final)
        finish(final, activeDetection)
        setPhase('ended')
      }
    },
    [addTurn, commit, escalate, finish, speak],
  )

  /* ─────────────── entry points ─────────────── */

  const start = useCallback(async () => {
    commit(initialState())
    setDetection(null)
    setStatus({ notice: null, micError: null, textOnly: false })
    startedAt.current = Date.now()
    setElapsed(0)
    addTurn('setu', LINES.greetingHi!.hi, 'greeting')
    await speak(LINES.greetingHi!.hi, 'greetingHi')
    addTurn('setu', LINES.greetingEn!.en, 'greeting')
    await speak(LINES.greetingEn!.en, 'greetingEn')
  }, [addTurn, commit, speak])

  const beginListening = useCallback(async () => {
    stopSpeaking()
    try {
      recorder.current = await startRecording()
      setPhase('listening')
      setStatus((current) => ({ ...current, micError: null }))
    } catch (error) {
      const kind = (error as Error).message === 'mic-denied' ? 'denied' : 'unavailable'
      setStatus((current) => ({ ...current, micError: kind }))
      setPhase('idle')
    }
  }, [])

  const endListening = useCallback(async () => {
    const active = recorder.current
    if (!active || busy.current) return
    recorder.current = null
    busy.current = true
    setPhase('thinking')
    const blob = await active.stop()

    let audioBase64: string | null = null
    try {
      audioBase64 = await blobToWavBase64(blob)
    } catch {
      setStatus((current) => ({ ...current, notice: 'audio-unreadable' }))
    }

    let activeDetection = detection

    if (!activeDetection && options.rehearseContested) {
      activeDetection = combine(
        { serviceId: PRIMARY_SERVICE_ID, langCode: 'hi', scriptCode: 'deva', langScore: 0.92 },
        { serviceId: SECONDARY_SERVICE_ID, langCode: 'mai', scriptCode: 'deva', langScore: 0.98 },
        'simulated',
      )
      setDetection(activeDetection)
    }

    // The first reply is what the language is detected from, using both models.
    if (!activeDetection && audioBase64 && config.inferenceKey) {
      try {
        const detector = createBhashiniDetector(config)
        const wav = await (await fetch(`data:audio/wav;base64,${audioBase64}`)).blob()
        activeDetection = await detector.detect({ callId: 'voice', audio: wav })
        setDetection(activeDetection)
      } catch {
        setStatus((current) => ({ ...current, notice: 'detection-failed' }))
      }
    }

    if (!activeDetection) {
      activeDetection = typedDetection('')
      setDetection(activeDetection)
    }

    // Case F: the two models disagree — continue in Hindi, flag the dialect gap, hand over.
    if (activeDetection.agreement === 'contested' && stateRef.current.stage === 'greeting') {
      commit((current) => ({ ...current, dialectGap: true }))
      await escalate(
        'ai-low-confidence',
        'Detection contested between the two models — dialect gap',
        { text: LINES.cannotUnderstand!.hi, cacheId: 'cannotUnderstand' },
        activeDetection,
      )
      busy.current = false
      return
    }

    let heard: string | null = null
    if (audioBase64 && config.inferenceKey) {
      heard = await transcribe(audioBase64, activeDetection.languageCode, config.inferenceKey)
    }

    if (!heard) {
      // Case I / H: could not hear. Say so, let them try again or type.
      setStatus((current) => ({ ...current, notice: 'not-heard' }))
      setPhase('idle')
      busy.current = false
      return
    }

    try {
      await handleReply(heard, activeDetection)
    } finally {
      busy.current = false
    }
  }, [commit, config, detection, escalate, handleReply, options.rehearseContested])

  /** The stage fallback: everything the voice path does, driven by typed text. */
  const submitTyped = useCallback(
    async (text: string) => {
      if (!text.trim() || busy.current) return
      busy.current = true
      setPhase('thinking')
      let activeDetection = detection
      if (!activeDetection) {
        activeDetection = options.rehearseContested
          ? combine(
              { serviceId: PRIMARY_SERVICE_ID, langCode: 'hi', scriptCode: 'deva', langScore: 0.92 },
              { serviceId: SECONDARY_SERVICE_ID, langCode: 'mai', scriptCode: 'deva', langScore: 0.98 },
              'simulated',
            )
          : typedDetection(text)
        setDetection(activeDetection)
      }

      // Case F: the two models disagree, so the call is handed over before it begins.
      if (activeDetection.agreement === 'contested' && stateRef.current.stage === 'greeting') {
        commit((latest) => ({ ...latest, dialectGap: true }))
        addTurn('caller', text.trim(), 'greeting')
        await escalate(
          'ai-low-confidence',
          'Detection contested between the two models — dialect gap',
          { text: LINES.cannotUnderstand!.hi, cacheId: 'cannotUnderstand' },
          activeDetection,
        )
        busy.current = false
        return
      }

      try {
        await handleReply(text.trim(), activeDetection)
      } finally {
        busy.current = false
      }
      setPhase((current) => (current === 'ended' ? current : 'idle'))
    },
    [addTurn, commit, detection, escalate, handleReply, options.rehearseContested],
  )

  const reset = useCallback(() => {
    stopSpeaking()
    recorder.current?.cancel()
    recorder.current = null
    commit(initialState())
    setDetection(null)
    setStatus({ notice: null, micError: null, textOnly: false })
    setPhase('idle')
    setElapsed(0)
  }, [commit])

  return {
    state,
    phase,
    detection,
    status,
    spoken,
    elapsed,
    setElapsed,
    languageName: detection ? languageNameFor(detection.languageCode) : null,
    start,
    beginListening,
    endListening,
    submitTyped,
    reset,
  }
}
