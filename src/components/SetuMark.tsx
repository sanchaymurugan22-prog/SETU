// Stroke colours for the voice-span mark, from the brand sheet: three arcs, then the deck.
const TONES = {
  onLight: ['#0088b0', '#38a6cf', '#99e0ff', '#0a303e'],
  onDark: ['#99e0ff', '#62c5ee', '#e9f8ff', '#f3f2f2'],
} as const

export function SetuMark({ size, tone = 'onLight' }: { size: number; tone?: keyof typeof TONES }) {
  const [inner, middle, outer, deck] = TONES[tone]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="SETU mark">
      <path d="M14 46 Q32 28 50 46" fill="none" stroke={inner} strokeWidth="5" strokeLinecap="round" />
      <path d="M14 46 Q32 15 50 46" fill="none" stroke={middle} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M14 46 Q32 3 50 46" fill="none" stroke={outer} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 50 H18 M46 50 H60" fill="none" stroke={deck} strokeWidth="6" />
    </svg>
  )
}
