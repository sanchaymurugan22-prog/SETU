/**
 * A worked example of a completed call, shown before anyone presses Start.
 *
 * The section used to open on an empty transcript, which meant a viewer had to place a
 * call before there was anything to look at — and in front of a room that is the worst
 * possible first impression. This is the same call the demo script walks through, already
 * played out, so the page explains itself at a glance: the detection panel, the stage
 * tracker and the captured profile are all populated the moment the section opens.
 *
 * It is labelled on screen as a recorded example and it is NOT live: no Bhashini request
 * is made for it, nothing is written to Firestore, and it never reaches Completed Calls
 * or the Gap Map. Pressing Start replaces it with a real call.
 *
 * The words are the assistant's actual lines from lines.json rather than prose written
 * for a screenshot, and the caller is a real seeded beneficiary at a real centre — so
 * what a viewer reads here is what a live call produces.
 */

import { courseRecord } from '../data/courseCatalogue'
import type { LanguageDetection } from '../lib/languageDetection'
import { LINES, type CallState, type Turn } from './script'

/** The assistant's own line, in the language the example is played in. */
function setuLine(id: keyof typeof LINES | string, stage: Turn['stage']): Turn {
  return { speaker: 'setu', text: LINES[id]?.en ?? '', stage }
}

function caller(text: string, stage: Turn['stage']): Turn {
  return { speaker: 'caller', text, stage }
}

/**
 * Sunita Devi of Tetartoli, Ghaghra block, Gumla — the caller from the demo script.
 * Low schooling, sews at home already, cannot travel far. Tailoring L1 at the Ghaghra
 * centre is 3 km away, has seats, and needs no reading.
 */
const TURNS: Turn[] = [
  setuLine('greetingHi', 'greeting'),
  caller('Haan… namaste. Main sun rahi hoon.', 'greeting'),

  setuLine('consent', 'consent'),
  caller('Haan, theek hai.', 'consent'),

  setuLine('name', 'name'),
  caller('Sunita Devi.', 'name'),

  setuLine('location', 'location'),
  caller('Tetartoli gaon, Ghaghra block.', 'location'),

  setuLine('work', 'work'),
  caller('Khet me mazdoori karti hoon, jab kaam milta hai.', 'work'),

  setuLine('family', 'family'),
  caller('Maa silai karti thi, ghar pe hi.', 'family'),

  setuLine('education', 'education'),
  caller('Paanchvi tak padhi hoon. Zyada padhna nahi aata.', 'education'),

  setuLine('educationNone', 'education'),

  setuLine('interest', 'interest'),
  caller('Silai seekhna chahti hoon. Thoda aata hai, par sahi se nahi.', 'interest'),

  setuLine('travel', 'travel'),
  caller('Door nahi ja sakti. Ghar me bacche hain.', 'travel'),

  setuLine('preference', 'preference'),
  caller('Ghar pe hi kuch kaam kar loon to theek rahega.', 'preference'),

  setuLine('secondary', 'secondary'),
  caller('Bete ka number hai — usme WhatsApp bhi hai.', 'secondary'),

  {
    speaker: 'setu',
    // Stage 12 of the script: the recommendation always carries its reason in plain words.
    text:
      'There is a tailoring course at the Ghaghra Training Centre, about 3 km from you. ' +
      'It needs no reading, your mother did the same work, and there is demand for tailoring ' +
      'in your block. Shall I keep a seat for you?',
    stage: 'recommendation',
  },
  caller('Haan, rakh dijiye.', 'recommendation'),

  {
    speaker: 'setu',
    text:
      'Done. The batch runs in the morning, six days a week, for twelve weeks. ' +
      'There is no fee for this course. I will send the details to your phone and to your son.',
    stage: 'enrolment',
  },
  caller('Theek hai. Dhanyawad.', 'enrolment'),

  {
    speaker: 'setu',
    text: 'Someone will call you again to check that you have started. Namaste.',
    stage: 'close',
  },
]

/**
 * Both models agreed on Hindi, so this caller is one the stack serves well.
 * The contested case — where they disagree and the call is handed to a human — is the
 * other example, and it is rehearsed live with ?rehearse=contested.
 */
const DETECTION: LanguageDetection = {
  languageCode: 'hi',
  languageName: 'Hindi',
  confidence: 0.94,
  agreement: 'agreed',
  primary: {
    serviceId: 'bhashini/iitmandi/audio-lang-detection/gpu',
    langCode: 'hi',
    scriptCode: 'deva',
    langScore: 0.94,
  },
  secondary: {
    serviceId: 'bhashini/ald',
    langCode: 'hi',
    scriptCode: 'deva',
    langScore: 0.91,
  },
  provider: 'simulated',
}

/** The example as the experience renders it: a finished call sitting at the close stage. */
export function sampleCallState(): CallState {
  const course = courseRecord('Tailoring L1')
  return {
    stage: 'close',
    profile: {
      name: 'Sunita Devi',
      village: 'Tetartoli',
      block: 'Ghaghra',
      district: 'Gumla',
      currentWork: 'Farm labour, when work is available',
      familyOccupation: 'Tailoring at home',
      familyTrade: 'Tailoring',
      schoolYears: 5,
      literacy: 'low',
      interests: ['tailoring'],
      mobility: 'cannot-travel',
      hasSmartphone: false,
      workPreference: 'self-employment',
      secondaryNumber: "Son's number, with WhatsApp",
      isBasicPhoneOnly: true,
      consent: true,
      anonymous: false,
    },
    turns: TURNS,
    recommendation: course
      ? {
          course,
          centreName: 'Ghaghra Training Centre',
          centreBlock: 'Ghaghra',
          centreDistrict: 'Gumla',
          distanceKm: 3,
          seatsLeft: 6,
          reasons: ['interest', 'family-trade', 'close', 'own-work', 'local-demand'],
          localDemand: true,
        }
      : null,
    rejected: [],
    escalation: null,
    outcome: 'completed',
    unclear: 0,
    noLocalDemand: false,
    dialectGap: false,
  }
}

export const SAMPLE_DETECTION = DETECTION
