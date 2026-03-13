/**
 * Splits a text into sentences/clauses using punctuation boundaries.
 * Considers sentence-ending punctuation (. ? !) and CJK (。？！), and also
 * treats commas and semicolons as clause separators. Returns the original
 * text as a single item if no punctuation is present.
 */
export function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  // Match runs of non-punctuation followed by optional punctuation and spaces.
  // This captures clauses ending with .,?,!, comma or semicolon, and also the
  // final tail (which may lack punctuation).
  const parts = trimmed.match(/[^.?!,;:：。？！]+[.?!,;:：。？！]*\s*/g)
  if (!parts) return [trimmed]

  const result = parts.map((s) => s.trim()).filter((s) => s.length > 0)

  // If there's no punctuation at all, avoid splitting words.
  const hasPunctuation = /[.?!,;:：。？！]/.test(trimmed)
  if (!hasPunctuation) return [trimmed]

  return result.length > 0 ? result : [trimmed]
}

/** Counts how many words precede sentence at index sentIdx in the full text splits. */
export function sentenceWordOffset(sentences: string[], sentIdx: number): number {
  let offset = 0
  for (let i = 0; i < sentIdx; i++) {
    offset += sentences[i].split(' ').length
  }
  return offset
}
