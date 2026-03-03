import { useEffect, useState } from 'react'
import { getLocalizedLanguageName, getUILabels } from '../i18n/ui'
import { getSpeechLocale } from '../services/speechLocale'
import { formatPhrasesToTextarea, getDefaultPhrasesForLanguage, parsePhrasesFromTextarea, pickRandomUniquePhrases } from '../services/phraseStorage'
import { getVoicesForLanguage, getVoiceOptionLabel } from '../services/voiceCatalog'
import { LANGUAGE_OPTIONS, type LanguageCode } from '../types/language'
import type { AppSettings } from '../types/settings'

interface SettingsPageProps {
  settings: AppSettings
  onSettingsChange: (next: Partial<AppSettings>) => void
  phraseTextareaValue: string
  onSavePhrases: (value: string) => void
  onRestoreDefaultPhrases: () => string
  onDirtyChange: (isDirty: boolean) => void
}

export function SettingsPage({
  settings,
  onSettingsChange,
  phraseTextareaValue,
  onSavePhrases,
  onRestoreDefaultPhrases,
  onDirtyChange,
}: SettingsPageProps) {
  const labels = getUILabels(settings.nativeLanguage)
  const saveTooltip = labels.settingsTooltipSave
  const clearTooltip = labels.settingsTooltipClear
  const randomTooltip = labels.settingsTooltipRandom
  const restoreTooltip = labels.settingsTooltipRestore
  const [textareaValue, setTextareaValue] = useState(phraseTextareaValue)
  const [savedBaselineValue, setSavedBaselineValue] = useState(phraseTextareaValue)
  const [savedMessage, setSavedMessage] = useState('')
  const [isSaveFlashActive, setIsSaveFlashActive] = useState(false)
  const [isSaveConfirmed, setIsSaveConfirmed] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false)
  const [draftVoiceByLanguage, setDraftVoiceByLanguage] = useState(settings.voiceByLanguage)
  const [savedBaselineVoiceByLanguage, setSavedBaselineVoiceByLanguage] = useState(settings.voiceByLanguage)
  const totalPhrases = parsePhrasesFromTextarea(textareaValue).length
  const hasUnsavedVoiceChange =
    (draftVoiceByLanguage[settings.targetLanguage] ?? '') !==
    (savedBaselineVoiceByLanguage[settings.targetLanguage] ?? '')
  const hasUnsavedChanges = textareaValue !== savedBaselineValue || hasUnsavedVoiceChange
  const selectedVoiceURI = draftVoiceByLanguage[settings.targetLanguage] ?? ''

  useEffect(() => {
    onDirtyChange(hasUnsavedChanges)
  }, [hasUnsavedChanges, onDirtyChange])

  useEffect(() => {
    if (!savedMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSavedMessage('')
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [savedMessage])

  useEffect(() => {
    const locale = getSpeechLocale(settings.targetLanguage)

    const refreshVoices = () => {
      setAvailableVoices(getVoicesForLanguage(settings.targetLanguage, locale))
    }

    refreshVoices()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
      window.speechSynthesis.cancel()
    }
  }, [settings.targetLanguage])

  const playVoicePreview = (language: LanguageCode, voiceURI?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      return
    }

    const previewText = getDefaultPhrasesForLanguage(language)[0] ?? 'Hello'
    const utterance = new SpeechSynthesisUtterance(previewText)
    const locale = getSpeechLocale(language)

    utterance.lang = locale

    if (voiceURI) {
      const matchingVoice = window.speechSynthesis
        .getVoices()
        .find((voice) => voice.voiceURI === voiceURI)

      if (matchingVoice) {
        utterance.voice = matchingVoice
      }
    }

    utterance.volume = settings.volume
    utterance.rate = settings.rate
    utterance.onend = () => {
      setIsVoicePreviewPlaying(false)
    }
    utterance.onerror = () => {
      setIsVoicePreviewPlaying(false)
    }

    window.speechSynthesis.cancel()
    setIsVoicePreviewPlaying(true)
    window.speechSynthesis.speak(utterance)
  }

  const handleVoiceChange = (voiceURI: string) => {
    const nextVoiceByLanguage = { ...draftVoiceByLanguage }

    if (voiceURI) {
      nextVoiceByLanguage[settings.targetLanguage] = voiceURI
    } else {
      delete nextVoiceByLanguage[settings.targetLanguage]
    }

    setDraftVoiceByLanguage(nextVoiceByLanguage)
    setSavedMessage('')
    playVoicePreview(settings.targetLanguage, voiceURI || undefined)
  }

  const handleSave = () => {
    onSettingsChange({ voiceByLanguage: draftVoiceByLanguage })
    onSavePhrases(textareaValue)
    setSavedBaselineValue(textareaValue)
    setSavedBaselineVoiceByLanguage(draftVoiceByLanguage)
    setSavedMessage(labels.saveSuccess)
    setIsSaveConfirmed(true)
    setIsSaveFlashActive(true)
    window.setTimeout(() => {
      setIsSaveConfirmed(false)
    }, 1400)
    window.setTimeout(() => {
      setIsSaveFlashActive(false)
    }, 520)
  }

  const handleRestore = () => {
    const shouldRestore = window.confirm(labels.restoreConfirm)

    if (!shouldRestore) {
      return
    }

    const restoredText = onRestoreDefaultPhrases()
    setTextareaValue(restoredText)
    setSavedBaselineValue(restoredText)
    setSavedMessage(labels.restoreSuccess)
  }

  const handleAddRandomPhrases = () => {
    const currentPhrases = parsePhrasesFromTextarea(textareaValue)
    const randomPhrases = pickRandomUniquePhrases(settings.targetLanguage, currentPhrases, 10)
    const nextPhrases = [...currentPhrases, ...randomPhrases]

    setTextareaValue(formatPhrasesToTextarea(nextPhrases))
    setSavedMessage('')
  }

  const handleClearPhrases = () => {
    setTextareaValue('')
    setSavedMessage('')
  }

  return (
    <section className="card">
      <div className="settingsHeader">
        <h2>{labels.settingsTitle}</h2>
        <select
          className="practiceLanguageSelect"
          value={settings.targetLanguage}
          onChange={(event) => {
            const nextLanguage = event.target.value as LanguageCode

            if (nextLanguage === settings.targetLanguage) {
              return
            }

            if (hasUnsavedChanges) {
              const shouldChange = window.confirm(labels.unsavedChangesConfirm)

              if (!shouldChange) {
                return
              }
            }

            onSettingsChange({ targetLanguage: nextLanguage })
            playVoicePreview(nextLanguage, savedBaselineVoiceByLanguage[nextLanguage])
          }}
          aria-label={labels.settingsTargetLanguage}
          title={labels.settingsTargetLanguage}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {getLocalizedLanguageName(settings.nativeLanguage, option.code)}
            </option>
          ))}
        </select>
      </div>

      <label className="field">
        <span>{labels.settingsTextareaLabel}</span>
        <div className="settingsTextareaShell">
          <textarea
            className={isSaveFlashActive ? 'settingsTextarea isSuccessFlash' : 'settingsTextarea'}
            rows={10}
            spellCheck={true}
            lang={getSpeechLocale(settings.targetLanguage)}
            value={textareaValue}
            onChange={(event) => {
              setTextareaValue(event.target.value)
              setSavedMessage('')
            }}
            placeholder={labels.settingsTextareaPlaceholder}
          />
        </div>
      </label>

      <div className="row settingsActions">
        <div className="settingsVoiceInline">
          <select
            className="settingsVoiceSelectInline"
            value={selectedVoiceURI}
            onChange={(event) => handleVoiceChange(event.target.value)}
            aria-label={labels.voice}
            title={labels.voice}
          >
            <option value="">{labels.voiceAuto}</option>
            {availableVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {getVoiceOptionLabel(voice)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="settingsActionButton settingsActionButtonPrimary"
          onClick={handleSave}
          title={saveTooltip}
          aria-label={saveTooltip}
        >
          <span className="settingsActionIcon" aria-hidden="true">{isSaveConfirmed ? '✅' : '💾'}</span>
        </button>
        <button
          type="button"
          className="settingsActionButton settingsActionButtonDanger"
          onClick={handleClearPhrases}
          disabled={textareaValue.trim().length === 0}
          title={clearTooltip}
          aria-label={clearTooltip}
        >
          <span className="settingsActionIcon" aria-hidden="true">🧹</span>
        </button>
        <button
          type="button"
          className="settingsActionButton"
          onClick={handleAddRandomPhrases}
          title={randomTooltip}
          aria-label={randomTooltip}
        >
          <span className="settingsActionIcon" aria-hidden="true">✨</span>
        </button>
        <button
          type="button"
          className="settingsActionButton"
          onClick={handleRestore}
          title={restoreTooltip}
          aria-label={restoreTooltip}
        >
          <span className="settingsActionIcon" aria-hidden="true">↺</span>
        </button>
        {(savedMessage || isVoicePreviewPlaying) && (
          <span className="settingsSaveStatusInline">{savedMessage || labels.voicePreviewPlaying}</span>
        )}
        <span className="settingsCounterItem settingsCounterInline">{labels.settingsCounterPhrases}: {totalPhrases}</span>
      </div>
    </section>
  )
}
