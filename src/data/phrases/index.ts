import dePhrases from './de.json'
import enPhrases from './en.json'
import esPhrases from './es.json'
import frPhrases from './fr.json'
import itPhrases from './it.json'
import jaPhrases from './ja.json'
import koPhrases from './ko.json'
import ptPhrases from './pt.json'
import zhPhrases from './zh.json'
import type { PhraseEntry } from '../../types/phrases'
import type { LanguageCode } from '../../types/language'

export const PHRASES_BY_LANGUAGE: Record<LanguageCode, PhraseEntry[]> = {
  de: dePhrases as PhraseEntry[],
  en: enPhrases as PhraseEntry[],
  es: esPhrases as PhraseEntry[],
  fr: frPhrases as PhraseEntry[],
  it: itPhrases as PhraseEntry[],
  ja: jaPhrases as PhraseEntry[],
  ko: koPhrases as PhraseEntry[],
  pt: ptPhrases as PhraseEntry[],
  zh: zhPhrases as PhraseEntry[],
}
