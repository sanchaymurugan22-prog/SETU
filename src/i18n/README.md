# Interface translations — the pattern

Every user-visible string goes through i18next. Sample/seeded data (block names, people,
report text) stays in its own language and is not translated here.

## Adding a screen

1. **Write the strings in `locales/en.json` first**, under a key namespace named after the
   screen: `gapMap.*`, `beneficiaries.*`, `login.*`. Reuse `common.*`, `status.*` and
   `time.*` rather than repeating a word.
2. **Use the hook in the component:**

   ```tsx
   import { useTranslation } from 'react-i18next'

   const { t } = useTranslation()
   return <h1>{t('gapMap.priority.title')}</h1>
   ```

3. **Interpolate, never concatenate.** Word order differs between languages:

   ```tsx
   t('gapMap.priority.demandLine', { count: gap.demandCount, course: gap.course })
   ```

4. **Copy the new keys into all ten locale files** and translate them.
5. **Run `npm run i18n:check`.** It fails on missing keys, unknown keys, and values left
   in English. Run it before every commit that touches the interface.

## Rules

- No bare strings in JSX. If you type an English word into a component, it is a bug.
- Keys are stable identifiers; change the English value freely, rename keys rarely.
- `aria-label`, `title` and `placeholder` are user-visible too — translate them.
- Data from `src/data/**` is sample content, not UI copy. Leave it alone.
- `uiLanguage.ts` holds the console's own language — the only language an official picks.
  What SETU speaks to a caller is detected per call (`lib/languageDetection.ts`) and is
  never a setting; display it from the call's detection record.
