import { PHRASES_BY_LANGUAGE } from '../data/phrases'
import { RANDOM_PHRASE_POOL_BY_LANGUAGE } from '../data/randomPhrasePool'
import { LANGUAGE_OPTIONS } from '../types/language'
import type { LanguageCode } from '../types/language'
import type { PhraseEntry } from '../types/phrases'

const PHRASE_STORAGE_KEY = 'shadowing-app-custom-phrases'

export type CustomPhraseBank = Record<LanguageCode, string[]>

const EMPTY_CUSTOM_BANK: CustomPhraseBank = {
  pt: [],
  en: [],
  es: [],
  de: [],
  ja: [],
  zh: [],
  fr: [],
  it: [],
  ko: [],
}

function normalizePhraseArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function parsePhrasesFromTextarea(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function formatPhrasesToTextarea(phrases: string[]): string {
  return phrases.join('\n')
}

export function loadCustomPhraseBank(): CustomPhraseBank {
  const rawValue = localStorage.getItem(PHRASE_STORAGE_KEY)

  if (!rawValue) {
    return EMPTY_CUSTOM_BANK
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<Record<LanguageCode, unknown>>

    const normalized: CustomPhraseBank = {
      pt: normalizePhraseArray(parsed.pt),
      en: normalizePhraseArray(parsed.en),
      es: normalizePhraseArray(parsed.es),
      de: normalizePhraseArray(parsed.de),
      ja: normalizePhraseArray(parsed.ja),
      zh: normalizePhraseArray(parsed.zh),
      fr: normalizePhraseArray(parsed.fr),
      it: normalizePhraseArray(parsed.it),
      ko: normalizePhraseArray(parsed.ko),
    }

    const normalizedRaw = JSON.stringify(normalized)

    if (normalizedRaw !== rawValue) {
      localStorage.setItem(PHRASE_STORAGE_KEY, normalizedRaw)
    }

    return normalized
  } catch {
    return EMPTY_CUSTOM_BANK
  }
}

export function saveCustomPhraseBank(bank: CustomPhraseBank) {
  localStorage.setItem(PHRASE_STORAGE_KEY, JSON.stringify(bank))
}

export function buildPhraseEntries(language: LanguageCode, customBank: CustomPhraseBank): PhraseEntry[] {
  const customPhrases = customBank[language]

  if (customPhrases.length === 0) {
    return PHRASES_BY_LANGUAGE[language].map((entry, index) => {
      const translations: PhraseEntry['translations'] = {}

      LANGUAGE_OPTIONS.forEach((option) => {
        if (option.code === language) {
          return
        }

        const translatedEntry = PHRASES_BY_LANGUAGE[option.code][index]

        if (translatedEntry?.text) {
          translations[option.code] = translatedEntry.text
        }
      })

      return {
        ...entry,
        translations,
      }
    })
  }

  return customPhrases.map((text, index) => ({
    id: `custom-${language}-${index + 1}`,
    text,
    translations: {},
  }))
}

export function getDefaultPhrasesForLanguage(language: LanguageCode): string[] {
  return PHRASES_BY_LANGUAGE[language].map((entry) => entry.text)
}

function normalizePhraseForCompare(phrase: string): string {
  return phrase.trim().toLocaleLowerCase()
}

export function pickRandomUniquePhrases(
  language: LanguageCode,
  existingPhrases: string[],
  count: number,
): string[] {
  const existingSet = new Set(existingPhrases.map(normalizePhraseForCompare))
  const candidates = RANDOM_PHRASE_POOL_BY_LANGUAGE[language].filter(
    (phrase) => !existingSet.has(normalizePhraseForCompare(phrase)),
  )

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temp = candidates[index]
    candidates[index] = candidates[randomIndex]
    candidates[randomIndex] = temp
  }

  return candidates.slice(0, Math.max(0, count))
}
