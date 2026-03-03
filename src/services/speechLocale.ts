import type { LanguageCode } from '../types/language'

export function getSpeechLocale(language: LanguageCode): string {
  const localeByLanguage: Record<LanguageCode, string> = {
    en: 'en-US',
    pt: 'pt-BR',
    es: 'es-ES',
    de: 'de-DE',
    ja: 'ja-JP',
    zh: 'zh-CN',
    fr: 'fr-FR',
    it: 'it-IT',
    ko: 'ko-KR',
  }

  return localeByLanguage[language]
}
