import type { LanguageCode } from '../types/language'

function normalizeLang(value: string) {
  return value.toLowerCase().replace('_', '-')
}

export function getVoicesForLanguage(language: LanguageCode, locale: string): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return []
  }

  const allVoices = window.speechSynthesis.getVoices()
  const normalizedLocale = normalizeLang(locale)
  const localePrefix = normalizedLocale.split('-')[0]

  const exactLocaleVoices = allVoices.filter((voice) => normalizeLang(voice.lang) === normalizedLocale)

  const sameLanguageVoices = allVoices.filter((voice) => {
    const voicePrefix = normalizeLang(voice.lang).split('-')[0]
    return voicePrefix === localePrefix || voicePrefix === language
  })

  const byVoiceURI = new Map<string, SpeechSynthesisVoice>()

  for (const voice of [...exactLocaleVoices, ...sameLanguageVoices]) {
    byVoiceURI.set(voice.voiceURI, voice)
  }

  return [...byVoiceURI.values()].sort((first, second) => {
    const firstIsExactLocale = normalizeLang(first.lang) === normalizedLocale
    const secondIsExactLocale = normalizeLang(second.lang) === normalizedLocale

    if (firstIsExactLocale && !secondIsExactLocale) {
      return -1
    }

    if (!firstIsExactLocale && secondIsExactLocale) {
      return 1
    }

    if (first.default && !second.default) {
      return -1
    }

    if (!first.default && second.default) {
      return 1
    }

    return first.name.localeCompare(second.name)
  })
}

export function getVoiceOptionLabel(voice: SpeechSynthesisVoice): string {
  return `${voice.name} (${voice.lang})`
}
