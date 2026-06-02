export const MASCOT_PHRASES_KEY = 'mascot_phrases'

export const DEFAULT_MASCOT_PHRASES = [
  'Precisa de ajuda?',
  'Veja os avisos do curso.',
  'Explore os projetos da comunidade.',
]

export function parseMascotPhrases(value: string | null | undefined) {
  if (!value) return DEFAULT_MASCOT_PHRASES

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      const phrases = parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)

      return phrases.length > 0 ? phrases : DEFAULT_MASCOT_PHRASES
    }
  } catch {}

  const phrases = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  return phrases.length > 0 ? phrases : DEFAULT_MASCOT_PHRASES
}

export function getRandomMascotPhrase(phrases: string[]) {
  if (phrases.length === 0) return DEFAULT_MASCOT_PHRASES[0]

  return phrases[Math.floor(Math.random() * phrases.length)]
}
