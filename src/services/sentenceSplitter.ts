/**
 * Splits a text into individual sentences using punctuation boundaries.
 * Works for latin scripts (.?!) and CJK (。？！).
 * Returns [text] unchanged if no split points are found.
 */
export function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  // Match a sentence = non-punctuation chars + ending punctuation + optional space
  const matches = trimmed.match(/[^.?!。？！]+[.?!。？！]+\s*/g)
  if (!matches || matches.length < 2) return [trimmed]

  const parts = matches.map((s) => s.trim()).filter((s) => s.length > 0)
  // Fallback: if match doesn't cover all characters, return original
  return parts.length > 1 ? parts : [trimmed]
}

/** Counts how many words precede sentence at index sentIdx in the full text splits. */
export function sentenceWordOffset(sentences: string[], sentIdx: number): number {
  let offset = 0
  for (let i = 0; i < sentIdx; i++) {
    offset += sentences[i].split(' ').length
  }
  return offset
}
