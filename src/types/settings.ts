import type { LanguageCode } from './language'

export interface AppSettings {
  nativeLanguage: LanguageCode
  targetLanguage: LanguageCode
  voiceByLanguage: Partial<Record<LanguageCode, string>>
  volume: number
  rate: number
  repetitions: number
  autoAdvance: boolean
  randomSpeed: boolean
  randomPhrases: boolean
  intervalSeconds: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  nativeLanguage: 'pt',
  targetLanguage: 'en',
  voiceByLanguage: {},
  volume: 1,
  rate: 0.8,
  repetitions: 3,
  autoAdvance: false,
  randomSpeed: false,
  randomPhrases: false,
  intervalSeconds: 1,
}
