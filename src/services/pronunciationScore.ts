export type PronunciationLevel = 'good' | 'medium' | 'poor'

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
}

export function scorePronunciation(recognized: string, target: string): PronunciationLevel {
  const recWords = normalizeWords(recognized)
  const tgtWords = normalizeWords(target)

  if (tgtWords.length === 0 || recWords.length === 0) return 'poor'

  const tgtSet = new Set(tgtWords)
  let matches = 0

  for (const word of recWords) {
    if (tgtSet.has(word)) matches++
  }

  const precision = matches / recWords.length
  const recall = matches / tgtWords.length
  const f1 = (2 * precision * recall) / (precision + recall + Number.EPSILON)

  if (f1 >= 0.85) return 'good'
  if (f1 >= 0.55) return 'medium'
  return 'poor'
}
