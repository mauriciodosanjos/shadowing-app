import type { LanguageCode } from '../types/language'
import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings'

const STORAGE_KEY = 'shadowing-app-settings'

const supportedLanguages: LanguageCode[] = ['pt', 'en', 'es', 'de', 'ja', 'zh', 'fr', 'it', 'ko']

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step
}

function normalizeLanguage(value: unknown, fallback: LanguageCode): LanguageCode {
  if (typeof value === 'string' && supportedLanguages.includes(value as LanguageCode)) {
    return value as LanguageCode
  }

  return fallback
}

function normalizeVoiceByLanguage(value: unknown): Partial<Record<LanguageCode, string>> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const rawEntries = Object.entries(value as Record<string, unknown>)
  const normalized: Partial<Record<LanguageCode, string>> = {}

  for (const [language, voiceURI] of rawEntries) {
    if (!supportedLanguages.includes(language as LanguageCode)) {
      continue
    }

    if (typeof voiceURI !== 'string' || voiceURI.trim().length === 0) {
      continue
    }

    normalized[language as LanguageCode] = voiceURI
  }

  return normalized
}

export function normalizeSettings(partial: Partial<AppSettings>): AppSettings {
  return {
    nativeLanguage: normalizeLanguage(partial.nativeLanguage, DEFAULT_SETTINGS.nativeLanguage),
    targetLanguage: normalizeLanguage(partial.targetLanguage, DEFAULT_SETTINGS.targetLanguage),
    voiceByLanguage: normalizeVoiceByLanguage(partial.voiceByLanguage),
    volume: clamp(partial.volume ?? DEFAULT_SETTINGS.volume, 0, 1),
    rate: clamp(roundToStep(partial.rate ?? DEFAULT_SETTINGS.rate, 0.2), 0.2, 1.4),
    repetitions: Math.round(clamp(partial.repetitions ?? DEFAULT_SETTINGS.repetitions, 1, 5)),
    autoAdvance: Boolean(partial.autoAdvance ?? DEFAULT_SETTINGS.autoAdvance),
    randomSpeed: Boolean(partial.randomSpeed ?? DEFAULT_SETTINGS.randomSpeed),
    randomPhrases: Boolean(partial.randomPhrases ?? DEFAULT_SETTINGS.randomPhrases),
    intervalSeconds: Math.round(clamp(partial.intervalSeconds ?? DEFAULT_SETTINGS.intervalSeconds, 1, 5)),
  }
}

export function loadSettings(): AppSettings {
  const rawValue = localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return DEFAULT_SETTINGS
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AppSettings>
    const normalized = normalizeSettings(parsed)
    const normalizedRaw = JSON.stringify(normalized)

    if (normalizedRaw !== rawValue) {
      localStorage.setItem(STORAGE_KEY, normalizedRaw)
    }

    return normalized
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
}
