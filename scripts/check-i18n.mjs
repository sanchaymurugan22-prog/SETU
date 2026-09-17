/**
 * Fails when a locale is missing keys that en.json has, carries keys it does not,
 * or still holds the English string where a translation is expected.
 *
 * Run: npm run i18n:check
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = 'src/i18n/locales'
const BASE = 'en'

/** Keys whose value is legitimately identical across languages (symbols, proper nouns). */
const SAME_ALLOWED = new Set([
  'common.none',
  'gapMap.deltaUp',
  'gapMap.deltaDown',
  'gapMap.popup.km',
  'beneficiaries.chip',
  'language.chooseAria',
  'beneficiaries.flagsAi',
  'beneficiaries.journey.flagChip',
  'callConsole.active.speakerSetu',
  'callConsole.report.forCall',
  'callConsole.report.smsPrimary',
  'callConsole.report.whatsappPrimary',
  'detection.confidenceShort',
  'detection.contestedPair',
])

function flatten(value, prefix = '', out = new Map()) {
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (entry && typeof entry === 'object') flatten(entry, path, out)
    else out.set(path, entry)
  }
  return out
}

const read = (code) => flatten(JSON.parse(readFileSync(join(LOCALES_DIR, `${code}.json`), 'utf8')))

const base = read(BASE)
const codes = readdirSync(LOCALES_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.replace('.json', ''))
  .filter((code) => code !== BASE)

let failures = 0

for (const code of codes) {
  const locale = read(code)
  const missing = [...base.keys()].filter((key) => !locale.has(key))
  const extra = [...locale.keys()].filter((key) => !base.has(key))
  const untranslated = [...locale.entries()].filter(
    ([key, value]) => base.get(key) === value && !SAME_ALLOWED.has(key) && !/^[\s\d.,·—%]*$/.test(String(value)),
  )

  const problems = missing.length + extra.length + untranslated.length
  failures += problems

  if (problems === 0) {
    console.log(`✓ ${code}: ${locale.size} keys, complete`)
    continue
  }
  console.log(`✗ ${code}:`)
  if (missing.length) console.log(`   missing ${missing.length}: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`)
  if (extra.length) console.log(`   unknown ${extra.length}: ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' …' : ''}`)
  if (untranslated.length)
    console.log(
      `   still English ${untranslated.length}: ${untranslated.slice(0, 8).map(([key]) => key).join(', ')}${untranslated.length > 8 ? ' …' : ''}`,
    )
}

console.log(`\n${codes.length} locales checked against ${BASE} (${base.size} keys).`)
if (failures > 0) {
  console.error(`${failures} problem(s) found.`)
  process.exit(1)
}
