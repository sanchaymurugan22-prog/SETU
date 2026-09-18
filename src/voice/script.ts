/**
 * The conversation, as rules.
 *
 * Every stage, branch and case here comes from SETU-CONVERSATION-SCRIPT.md. There is no
 * model in this file: what the caller said is matched against keyword tables, and where
 * nothing matches the script's own instruction applies — mark it unknown and move on
 * rather than press. The recommendation is chosen by matchCourses(), which filters on
 * NSQF eligibility, seats, travel radius, literacy and mobility.
 *
 * PART 4 rule 1 is enforced structurally: the only course facts the assistant can speak
 * are fields on the course record. A question it cannot answer from that record raises
 * an escalation instead of an answer.
 */

import { matchCourses, courseRecord, type MatchResult, type Mobility } from '../data/courseCatalogue'
import { blocks, districts } from '../data/jharkhandBeneficiaries'
import lineData from './lines.json'

export type StageId =
  | 'greeting'
  | 'consent'
  | 'name'
  | 'location'
  | 'work'
  | 'family'
  | 'education'
  | 'interest'
  | 'travel'
  | 'connectivity'
  | 'preference'
  | 'secondary'
  | 'recommendation'
  | 'enrolment'
  | 'close'
  | 'done'

export const STAGE_ORDER: StageId[] = [
  'greeting',
  'consent',
  'name',
  'location',
  'work',
  'family',
  'education',
  'interest',
  'travel',
  'connectivity',
  'preference',
  'secondary',
  'recommendation',
  'enrolment',
  'close',
  'done',
]

export type EscalationReason =
  | 'ai-low-confidence'
  | 'beneficiary-requested-human'
  | 'course-question'
  | 'placement'
  | 'self-employment'
  | 'repeated-rejection'

export interface Profile {
  name: string | null
  village: string | null
  block: string | null
  district: string | null
  currentWork: string | null
  familyOccupation: string | null
  familyTrade: string | null
  schoolYears: number | null
  literacy: 'low' | 'normal' | 'unknown'
  interests: string[]
  mobility: Mobility
  hasSmartphone: boolean
  workPreference: 'job' | 'self-employment' | 'unsure'
  secondaryNumber: string | null
  isBasicPhoneOnly: boolean
  consent: boolean | null
  anonymous: boolean
}

export interface Turn {
  speaker: 'setu' | 'caller'
  text: string
  stage: StageId
}

export interface CallState {
  stage: StageId
  profile: Profile
  turns: Turn[]
  recommendation: MatchResult | null
  rejected: { course: string; reason: string }[]
  escalation: { reason: EscalationReason; note: string } | null
  outcome: 'in-progress' | 'completed' | 'escalated' | 'ended'
  /** Consecutive replies SETU could not use, per Case H and Case I. */
  unclear: number
  noLocalDemand: boolean
  dialectGap: boolean
}

export function initialState(): CallState {
  return {
    stage: 'greeting',
    profile: {
      name: null,
      village: null,
      block: null,
      district: null,
      currentWork: null,
      familyOccupation: null,
      familyTrade: null,
      schoolYears: null,
      literacy: 'unknown',
      interests: [],
      mobility: 'limited',
      hasSmartphone: false,
      workPreference: 'unsure',
      secondaryNumber: null,
      isBasicPhoneOnly: true,
      consent: null,
      anonymous: false,
    },
    turns: [],
    recommendation: null,
    rejected: [],
    escalation: null,
    outcome: 'in-progress',
    unclear: 0,
    noLocalDemand: false,
    dialectGap: false,
  }
}

/* ─────────────────────────── What SETU says ─────────────────────────── */

/**
 * Spoken lines, authored in Hindi and English. A detected language outside these two is
 * spoken in Hindi — the same fallback the script uses for a contested detection — and
 * the English text is always shown on screen alongside.
 */
export interface Line {
  id: string
  hi: string
  en: string
}

/** The spoken lines live in lines.json so the build-time audio script uses the same text. */
export const LINES: Record<string, Line> = lineData as Record<string, Line>

/** Fixed lines worth pre-generating as audio, so no turn waits on a TTS round trip. */
export const CACHEABLE_LINES = [
  'greetingHi',
  'consent',
  'name',
  'location',
  'work',
  'family',
  'education',
  'interest',
  'travel',
  'connectivity',
  'preference',
  'secondary',
  'handOver',
  'cannotUnderstand',
  'courseQuestion',
  'stillThere',
]

/* ─────────────────────────── Understanding the reply ─────────────────────────── */

function normalise(text: string): string {
  return text.toLowerCase().replace(/[।.,!?]/g, ' ').replace(/\s+/g, ' ').trim()
}

function has(text: string, words: string[]): boolean {
  const normalised = normalise(text)
  return words.some((word) => normalised.includes(word))
}

const YES = ['हाँ', 'हां', 'जी', 'ठीक', 'बिलकुल', 'बिल्कुल', 'yes', 'ok', 'okay', 'sure', 'fine', 'haan', 'ji']
const NO = ['नहीं', 'ना ', 'मत', 'no', 'nahi', 'not']

/** Asking for a person is honoured at any point, without question (Case G, rule 3). */
const WANTS_HUMAN = [
  'व्यक्ति', 'आदमी', 'इंसान', 'किसी से बात', 'बात कराओ', 'बात करनी है',
  'person', 'human', 'someone', 'talk to a person', 'speak to someone', 'operator',
]

const ASKS_IF_HUMAN = ['क्या आप इंसान', 'आप मशीन', 'are you human', 'are you a person', 'are you real', 'robot']

const NO_JOBS = ['काम नहीं', 'नौकरी नहीं', 'रोज़गार नहीं', 'no jobs', 'no work here', 'there is no work']

const OWN_WORK = ['अपना काम', 'अपना व्यवसाय', 'दुकान खोल', 'own work', 'my own', 'business', 'self employ', 'start something']

const COURSE_QUESTION = [
  'कितना', 'कितनी', 'फीस', 'पैसा', 'कमाई', 'सैलरी', 'क्या सिखा', 'कब तक',
  'how much', 'fee', 'cost', 'earn', 'salary', 'what will i learn', 'how long',
]

export interface Understanding {
  /** An intent that overrides the current stage. */
  intent:
    | 'none'
    | 'wants-human'
    | 'asks-if-human'
    | 'no-jobs'
    | 'own-work'
    | 'course-question'
    | 'yes'
    | 'no'
  raw: string
}

export function understand(text: string): Understanding {
  if (has(text, WANTS_HUMAN)) return { intent: 'wants-human', raw: text }
  if (has(text, ASKS_IF_HUMAN)) return { intent: 'asks-if-human', raw: text }
  if (has(text, NO_JOBS)) return { intent: 'no-jobs', raw: text }
  if (has(text, OWN_WORK)) return { intent: 'own-work', raw: text }
  if (has(text, COURSE_QUESTION)) return { intent: 'course-question', raw: text }
  if (has(text, YES)) return { intent: 'yes', raw: text }
  if (has(text, NO)) return { intent: 'no', raw: text }
  return { intent: 'none', raw: text }
}

/* Per-stage extraction. Each returns null when nothing could be read. */

export function extractName(text: string): string | null {
  const cleaned = text
    .replace(/मेरा नाम|मेरा नाम है|my name is|i am|this is|नाम/gi, ' ')
    .replace(/[।.,!?]/g, ' ')
    .trim()
  // Hindi puts the copula last — "रवि उराँव है" is the name plus "is".
  const words = cleaned
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^(है|हूँ|हूं|हैं|रखा|बोल|रहा|रही)$/.test(word))
  if (words.length === 0) return null
  return words.slice(0, 3).join(' ')
}

/**
 * Callers say place names in their own script. The seeded data holds them in English, so
 * the common Devanagari spellings are mapped back here. A name not in this table falls
 * through to the script's own branch: ask for the district, then carry on with the
 * location marked uncertain rather than pressing the caller.
 */
const PLACE_ALIASES: Record<string, string> = {
  // Districts
  'गुमला': 'Gumla', 'राँची': 'Ranchi', 'रांची': 'Ranchi', 'खूंटी': 'Khunti', 'खुंटी': 'Khunti',
  'लोहरदगा': 'Lohardaga', 'सिमडेगा': 'Simdega', 'पलामू': 'Palamu', 'गढ़वा': 'Garhwa',
  'लातेहार': 'Latehar', 'चतरा': 'Chatra', 'हजारीबाग': 'Hazaribagh', 'हज़ारीबाग': 'Hazaribagh',
  'कोडरमा': 'Koderma', 'गिरिडीह': 'Giridih', 'धनबाद': 'Dhanbad', 'बोकारो': 'Bokaro',
  'रामगढ़': 'Ramgarh', 'देवघर': 'Deoghar', 'पाकुड़': 'Pakur', 'साहिबगंज': 'Sahibganj',
  'सरायकेला': 'Saraikela-Kharsawan', 'पूर्वी सिंहभूम': 'East Singhbhum', 'पश्चिमी सिंहभूम': 'West Singhbhum',
  // Blocks
  'घाघरा': 'Ghaghra', 'सिसई': 'Sisai', 'बसिया': 'Basia', 'बिशुनपुर': 'Bishunpur', 'चैनपुर': 'Chainpur',
  'तोरपा': 'Torpa', 'खूँटी': 'Khunti', 'अंगड़ा': 'Angara', 'अंगारा': 'Angara', 'बुंडू': 'Bundu',
  'रातू': 'Ratu', 'मांडर': 'Mandar', 'तमाड़': 'Tamar', 'किस्को': 'Kisko', 'पतरातू': 'Patratu',
  'हुसैनाबाद': 'Hussainabad', 'बालूमाथ': 'Balumath', 'सिमरिया': 'Simaria', 'बरकागांव': 'Barkagaon',
  'मधुपुर': 'Madhupur', 'महेशपुर': 'Maheshpur', 'घाटशिला': 'Ghatshila', 'चांडिल': 'Chandil',
  'बानो': 'Bano', 'बेंगाबाद': 'Bengabad', 'बलियापुर': 'Baliapur', 'निरसा': 'Nirsa', 'चास': 'Chas',
  'बरही': 'Barhi', 'सतगावां': 'Satgawan', 'मरकच्चो': 'Markacho', 'चक्रधरपुर': 'Chakradharpur',
  'गढ़वा ब्लॉक': 'Garhwa',
}

/** The canonical English name for whatever the caller said, or null. */
function canonicalPlace(text: string, known: string[]): string | null {
  const normalised = normalise(text)
  const direct = known.find((name) => normalised.includes(name.toLowerCase()))
  if (direct) return direct
  for (const [alias, canonical] of Object.entries(PLACE_ALIASES)) {
    if (text.includes(alias) && known.includes(canonical)) return canonical
  }
  return null
}

export function extractLocation(text: string): { village: string | null; block: string | null; district: string | null } {
  const block = canonicalPlace(text, blocks('all'))
  const district = canonicalPlace(text, districts())
  // The first word that is not a known block or district is taken as the village.
  const words = text.split(/[\s,।]+/).filter((word) => word.length > 2 && !PLACE_ALIASES[word])
  const village =
    words.find(
      (word) =>
        word.toLowerCase() !== block?.toLowerCase() &&
        word.toLowerCase() !== district?.toLowerCase() &&
        !/गाँव|गांव|village|block|प्रखंड|जिला|ज़िला|district|में|रहता|रहती|हूँ|हूं/i.test(word),
    ) ?? null
  return { village: village ?? null, block, district }
}

const WORK_PATTERNS: { words: string[]; work: string }[] = [
  { words: ['खेत', 'मजदूर', 'मज़दूर', 'farm', 'field', 'labour', 'labor'], work: 'agricultural labour' },
  { words: ['कुछ नहीं', 'बेरोज़गार', 'बेरोजगार', 'nothing', 'unemployed', 'no work'], work: 'unemployed' },
  { words: ['दुकान', 'shop', 'small business'], work: 'self-employed, retail' },
  { words: ['घर', 'बच्चे', 'home', 'children', 'housework'], work: 'unpaid domestic work' },
  { words: ['सिल', 'tailor', 'stitch'], work: 'tailoring' },
  { words: ['राजमिस्त्री', 'निर्माण', 'construction', 'mason'], work: 'construction' },
]

export function extractWork(text: string): string | null {
  return WORK_PATTERNS.find((pattern) => has(text, pattern.words))?.work ?? null
}

const TRADE_PATTERNS: { words: string[]; trade: string }[] = [
  { words: ['लोह', 'वेल्ड', 'धातु', 'metal', 'iron', 'weld', 'blacksmith'], trade: 'Welding' },
  { words: ['सिल', 'दर्जी', 'कपड़', 'tailor', 'stitch', 'cloth', 'sewing'], trade: 'Tailoring' },
  { words: ['बिजली', 'बिजल', 'electric', 'wiring'], trade: 'Electrical' },
  { words: ['मिस्त्री', 'ईंट', 'mason', 'brick'], trade: 'Masonry' },
  { words: ['खाना', 'अचार', 'food', 'pickle', 'cooking'], trade: 'Food' },
  { words: ['मोबाइल', 'mobile', 'phone repair'], trade: 'Mobile' },
  { words: ['गाड़ी', 'ड्राइव', 'driving', 'driver'], trade: 'Driving' },
  { words: ['सौंदर्य', 'ब्यूटी', 'beauty', 'parlour', 'salon'], trade: 'Beauty' },
]

export function extractTrade(text: string): string | null {
  return TRADE_PATTERNS.find((pattern) => has(text, pattern.words))?.trade ?? null
}

const HINDI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

/** Class numbers are spoken as words far more often than as digits. */
const CLASS_WORDS: { words: string[]; years: number }[] = [
  { words: ['बारहवीं', 'बारह', 'twelfth', 'twelve'], years: 12 },
  { words: ['ग्यारहवीं', 'ग्यारह', 'eleventh', 'eleven'], years: 11 },
  { words: ['दसवीं', 'दस', 'tenth', 'ten', 'matric'], years: 10 },
  { words: ['नौवीं', 'नौ', 'ninth', 'nine'], years: 9 },
  { words: ['आठवीं', 'आठ', 'eighth', 'eight'], years: 8 },
  { words: ['सातवीं', 'सात', 'seventh', 'seven'], years: 7 },
  { words: ['छठी', 'छह', 'छः', 'sixth', 'six'], years: 6 },
  { words: ['पाँचवीं', 'पांचवीं', 'पाँच', 'पांच', 'fifth', 'five'], years: 5 },
  { words: ['चौथी', 'चार', 'fourth', 'four'], years: 4 },
  { words: ['तीसरी', 'तीन', 'third', 'three'], years: 3 },
  { words: ['दूसरी', 'दो', 'second', 'two'], years: 2 },
]

export function extractEducation(text: string): { years: number | null; literacy: 'low' | 'normal' | 'unknown' } {
  if (has(text, ['नहीं पढ़', 'पढ़ी नहीं', 'स्कूल नहीं', 'अनपढ़', 'पढ़ना नहीं', 'did not go', "didn't go", 'no school', 'cannot read', 'never went'])) {
    return { years: 0, literacy: 'low' }
  }
  const converted = text.replace(/[०-९]/g, (digit) => HINDI_DIGITS[digit] ?? digit)
  const match = converted.match(/(\d{1,2})/)
  if (match) {
    const years = Number(match[1])
    if (years >= 0 && years <= 15) return { years, literacy: years >= 5 ? 'normal' : 'low' }
  }
  const spoken = CLASS_WORDS.find((entry) => has(text, entry.words))
  if (spoken) return { years: spoken.years, literacy: spoken.years >= 5 ? 'normal' : 'low' }
  return { years: null, literacy: 'unknown' }
}

export function extractMobility(text: string): Mobility {
  if (has(text, ['नहीं जा', 'बाहर नहीं', 'घर से', 'घर पर', 'cannot travel', "can't travel", 'not leave', 'from home', 'at home'])) {
    return 'cannot-travel'
  }
  if (has(text, ['पास', 'नज़दीक', 'नजदीक', 'दूर नहीं', 'किराया', 'बस का पैसा', 'close', 'nearby', 'not far', 'no money for'])) {
    return 'limited'
  }
  if (has(text, ['जा सकता', 'जा सकती', 'कहीं भी', 'can travel', 'anywhere', 'yes i can go'])) return 'can-travel'
  return 'limited'
}

export function extractPreference(text: string): 'job' | 'self-employment' | 'unsure' {
  if (has(text, ['नौकरी', 'job', 'employer', 'company'])) return 'job'
  if (has(text, OWN_WORK)) return 'self-employment'
  return 'unsure'
}

export function extractPhone(text: string): string | null {
  const converted = text.replace(/[०-९]/g, (digit) => HINDI_DIGITS[digit] ?? digit)
  const digits = converted.replace(/\D/g, '')
  if (digits.length >= 10) return `+91 ${digits.slice(-10, -5)} ${digits.slice(-5)}`
  return null
}

/* ─────────────────────────── The recommendation ─────────────────────────── */

export function buildRecommendation(profile: Profile): MatchResult | null {
  const results = matchCourses({
    block: profile.block ?? 'Ghaghra',
    district: profile.district ?? 'Gumla',
    schoolYears: profile.schoolYears,
    literacy: profile.literacy,
    mobility: profile.mobility,
    hasSmartphone: profile.hasSmartphone,
    interests: profile.interests,
    familyTrade: profile.familyTrade,
    workPreference: profile.workPreference,
  })
  return results[0] ?? null
}

/** The one warm sentence, assembled from the record — never from a guess. */
export function recommendationLine(match: MatchResult, profile: Profile, language: 'hi' | 'en'): string {
  const name = profile.name ?? ''
  const reason = reasonText(match, profile, language)
  if (language === 'hi') {
    return `${name ? name + ', ' : ''}${match.centreName} में ${match.course.course} का प्रशिक्षण है, आपके गाँव से लगभग ${match.distanceKm} किलोमीटर। यह आपके लिए ठीक है क्योंकि ${reason}। क्या मैं बताऊँ कि इसमें कैसे जुड़ना है?`
  }
  return `${name ? name + ', ' : ''}there is a ${match.course.course} course at ${match.centreName}, about ${match.distanceKm} kilometres from your village. It suits you because ${reason}. Shall I tell you how to join?`
}

function reasonText(match: MatchResult, profile: Profile, language: 'hi' | 'en'): string {
  const parts: string[] = []
  if (match.reasons.includes('family-trade') && profile.familyOccupation) {
    parts.push(language === 'hi' ? 'आपके परिवार ने यही काम किया है' : 'your family worked in this trade')
  }
  if (match.reasons.includes('interest')) {
    parts.push(language === 'hi' ? 'आपने यही सीखने की बात कही' : 'you said you would like to learn this')
  }
  if (match.reasons.includes('close')) {
    parts.push(language === 'hi' ? 'यह आपके गाँव के पास है' : 'it is close to your village')
  }
  if (match.reasons.includes('own-work')) {
    parts.push(language === 'hi' ? 'यह काम घर से किया जा सकता है' : 'this work can be done from home')
  }
  if (parts.length === 0) {
    parts.push(
      language === 'hi'
        ? 'यहाँ सीट है और यह आपकी पढ़ाई के अनुसार है'
        : 'there is a seat here and it fits the schooling you have',
    )
  }
  return parts.join(language === 'hi' ? ', और ' : ', and ')
}

/** Enrolment details, all read from the course record (Stage 13). */
export function enrolmentLine(match: MatchResult, language: 'hi' | 'en'): string {
  if (language === 'hi') {
    return `यह पाठ्यक्रम ${match.course.durationWeeks} सप्ताह का है और ${match.course.feeNote === 'free under PM-AJAY' ? 'पीएम-अजय के तहत निःशुल्क है — कोई फीस नहीं' : match.course.feeNote} है। मैं आपको विवरण अभी भेज रही हूँ।`
  }
  return `The course runs for ${match.course.durationWeeks} weeks and it is ${match.course.feeNote} — there is no fee. I will send you the details now.`
}

/**
 * Answering a question about a course, Case B. Only fields present on the record are
 * used; a missing field returns null and the caller is escalated instead of guessed at.
 */
export function courseAnswer(course: string, question: string, language: 'hi' | 'en'): string | null {
  const record = courseRecord(course)
  if (!record) return null

  const asksEarning = has(question, ['कमाई', 'पैसा', 'कितना मिलेगा', 'salary', 'earn', 'how much will i'])
  const asksFee = has(question, ['फीस', 'शुल्क', 'fee', 'cost', 'pay'])
  const asksLearn = has(question, ['क्या सिखा', 'क्या सीख', 'what will i learn', 'what is taught'])
  const asksLength = has(question, ['कब तक', 'कितने दिन', 'कितना समय', 'how long', 'duration'])

  if (asksEarning) {
    // Not on the record — the script says that is an escalation, not a guess.
    if (!record.earningRange) return null
    return language === 'hi'
      ? `इस काम में आमतौर पर ${record.earningRange} मिलते हैं। क्या यह आपको ठीक लगता है?`
      : `People doing this work typically earn ${record.earningRange}. Does that sound like something you would like to do?`
  }
  if (asksFee) {
    return language === 'hi'
      ? 'यह प्रशिक्षण पीएम-अजय के तहत निःशुल्क है। कोई फीस नहीं है।'
      : `This training is ${record.feeNote}. There is no fee.`
  }
  if (asksLearn) {
    return language === 'hi'
      ? `इसमें ${record.whatYouLearn} सिखाया जाता है, और ${record.toolsUsed} का उपयोग होता है।`
      : `You learn ${record.whatYouLearn}, using ${record.toolsUsed}.`
  }
  if (asksLength) {
    return language === 'hi'
      ? `यह ${record.durationWeeks} सप्ताह का प्रशिक्षण है।`
      : `The training runs for ${record.durationWeeks} weeks.`
  }
  return null
}
