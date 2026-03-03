import type { LanguageCode } from './language'

export interface PhraseEntry {
  id: string
  text: string
  translations: Partial<Record<LanguageCode, string>>
}
