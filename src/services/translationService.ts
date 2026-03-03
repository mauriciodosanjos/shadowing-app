import type { LanguageCode } from '../types/language'

const TRANSLATION_CACHE_KEY = 'shadowing-app-translation-cache'

type TranslationCache = Record<string, string>

const languageToApiCode: Record<LanguageCode, string> = {
  pt: 'pt',
  en: 'en',
  es: 'es',
  de: 'de',
  ja: 'ja',
  zh: 'zh-CN',
  fr: 'fr',
  it: 'it',
  ko: 'ko',
}

function buildCacheKey(text: string, source: LanguageCode, target: LanguageCode) {
  return `${source}__${target}__${text.trim().toLowerCase()}`
}

function sanitizeCache(cache: TranslationCache): TranslationCache {
  const sanitized: TranslationCache = {}

  for (const [key, value] of Object.entries(cache)) {
    const [sourceLanguage, targetLanguage] = key.split('__')

    if (sourceLanguage === 'ar' || targetLanguage === 'ar') {
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}

function loadCache(): TranslationCache {
  const rawValue = localStorage.getItem(TRANSLATION_CACHE_KEY)

  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as TranslationCache
    const sanitized = sanitizeCache(parsed)
    const sanitizedRaw = JSON.stringify(sanitized)

    if (sanitizedRaw !== rawValue) {
      localStorage.setItem(TRANSLATION_CACHE_KEY, sanitizedRaw)
    }

    return sanitized
  } catch {
    return {}
  }
}

function saveCache(cache: TranslationCache) {
  localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache))
}

export async function translatePhrase(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
): Promise<string | null> {
  const normalizedText = text.trim()

  if (!normalizedText) {
    return null
  }

  if (sourceLanguage === targetLanguage) {
    return normalizedText
  }

  const cache = loadCache()
  const cacheKey = buildCacheKey(normalizedText, sourceLanguage, targetLanguage)
  const cachedValue = cache[cacheKey]

  if (cachedValue) {
    return cachedValue
  }

  const sourceCode = languageToApiCode[sourceLanguage]
  const targetCode = languageToApiCode[targetLanguage]

  try {
    const url = new URL('https://api.mymemory.translated.net/get')
    url.searchParams.set('q', normalizedText)
    url.searchParams.set('langpair', `${sourceCode}|${targetCode}`)

    const response = await fetch(url.toString())

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      responseData?: { translatedText?: string }
    }

    const translatedText = data.responseData?.translatedText?.trim()

    if (!translatedText) {
      return null
    }

    const nextCache: TranslationCache = {
      ...cache,
      [cacheKey]: translatedText,
    }

    saveCache(nextCache)

    return translatedText
  } catch {
    return null
  }
}
