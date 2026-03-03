import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUILabels, getLocalizedLanguageName } from '../i18n/ui'
import { getSpeechLocale } from '../services/speechLocale'
import { ShadowingPlayer } from '../services/shadowingPlayer'
import { translatePhrase } from '../services/translationService'
import { LANGUAGE_OPTIONS, type LanguageCode } from '../types/language'
import type { PhraseEntry } from '../types/phrases'
import type { AppSettings } from '../types/settings'
import { isSpeechRecognitionSupported, startRecognition } from '../services/speechRecognition'
import { scorePronunciation } from '../services/pronunciationScore'
import { splitIntoSentences, sentenceWordOffset } from '../services/sentenceSplitter'

interface PracticePageProps {
  activeLanguage: LanguageCode
  phrases: PhraseEntry[]
  settings: AppSettings
  onLanguageChange: (language: LanguageCode) => void
  onSettingsChange: (next: Partial<AppSettings>) => void
}

export function PracticePage({ activeLanguage, phrases, settings, onLanguageChange, onSettingsChange }: PracticePageProps) {
  const labels = useMemo(() => getUILabels(settings.nativeLanguage), [settings.nativeLanguage])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentRepeat, setCurrentRepeat] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [waitSecondsLeft, setWaitSecondsLeft] = useState<number | null>(null)
  const [asyncTranslation, setAsyncTranslation] = useState<{ key: string; value: string | null }>({
    key: '',
    value: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1)
  const [isRecordingFor, setIsRecordingFor] = useState<string | null>(null)
  const [pronunciationRecord, setPronunciationRecord] = useState<{ key: string; result: 'good' | 'medium' | 'poor' } | null>(null)
  const [pronunciationErrorRecord, setPronunciationErrorRecord] = useState<{ key: string; message: string } | null>(null)
  const stopRecognitionRef = useRef<(() => void) | null>(null)
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playerRef = useRef(new ShadowingPlayer())
  const playPhraseRef = useRef<(phraseIndex: number, sentIdx: number) => void>(() => {})
  const settingsRef = useRef(settings)
  const lastRandomRateRef = useRef<number | null>(null)
  const playbackControlsRef = useRef({
    isPlaying: false,
    startPlayback: () => {},
    stopPlayback: () => {},
    nextPhrase: () => {},
    previousPhrase: () => {},
  })

  const speechSupported = isSpeechRecognitionSupported()

  const safeCurrentIndex = useMemo(() => {
    if (phrases.length === 0) {
      return 0
    }

    return Math.min(currentIndex, phrases.length - 1)
  }, [currentIndex, phrases.length])

  // Reset sentence/word state when phrase changes (adjust-during-render, avoids cascading effect)
  const [trackedPhraseIndex, setTrackedPhraseIndex] = useState(safeCurrentIndex)
  if (trackedPhraseIndex !== safeCurrentIndex) {
    setTrackedPhraseIndex(safeCurrentIndex)
    setSentenceIndex(0)
    setActiveWordIndex(-1)
  }

  const hasPhrases = phrases.length > 0
  const currentPhrase = hasPhrases ? phrases[safeCurrentIndex] : null
  const phraseSentences = currentPhrase ? splitIntoSentences(currentPhrase.text) : []
  const currentSentence = phraseSentences[sentenceIndex] ?? currentPhrase?.text ?? ''
  const totalSentences = phraseSentences.length
  const translationKey = currentPhrase
    ? `${currentPhrase.id}__${activeLanguage}__${settings.nativeLanguage}`
    : ''
  const practiceKey = currentSentence ? `${currentSentence}__${activeLanguage}` : null
  const isRecording = isRecordingFor !== null && isRecordingFor === practiceKey
  const pronunciationResult = pronunciationRecord?.key === practiceKey ? pronunciationRecord.result : null
  const pronunciationError = pronunciationErrorRecord?.key === practiceKey ? pronunciationErrorRecord.message : null

  useEffect(() => {
    const player = playerRef.current

    return () => {
      player.stop()
      if (startTimeoutRef.current !== null) clearTimeout(startTimeoutRef.current)
      stopRecognitionRef.current?.()
    }
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    return () => {
      if (startTimeoutRef.current !== null) {
        clearTimeout(startTimeoutRef.current)
        startTimeoutRef.current = null
      }
      stopRecognitionRef.current?.()
      stopRecognitionRef.current = null
    }
  }, [safeCurrentIndex, activeLanguage])

  useEffect(() => {
    let isMounted = true

    if (!currentPhrase || currentPhrase.translations[settings.nativeLanguage]) {
      return () => {
        isMounted = false
      }
    }

    translatePhrase(currentPhrase.text, activeLanguage, settings.nativeLanguage).then((translated) => {
      if (!isMounted) {
        return
      }

      setAsyncTranslation({ key: translationKey, value: translated })
    })

    return () => {
      isMounted = false
    }
  }, [activeLanguage, currentPhrase, settings.nativeLanguage, translationKey])

  const resolvedTranslation =
    currentPhrase?.translations[settings.nativeLanguage] ??
    (asyncTranslation.key === translationKey ? asyncTranslation.value : null)
  const runningStatus = isPlaying ? `${currentRepeat}/${settings.repetitions}` : ''
  const nextStatus = waitSecondsLeft !== null ? `${waitSecondsLeft.toFixed(1)}s` : ''
  const sentenceStatus = totalSentences > 1 ? `${sentenceIndex + 1}/${totalSentences}` : ''
  const statusText = [sentenceStatus, runningStatus, nextStatus].filter(Boolean).join(' · ')
  const getRandomPhraseIndex = useCallback((excludedIndex: number) => {
    if (phrases.length <= 1) {
      return 0
    }

    let randomIndex = excludedIndex

    while (randomIndex === excludedIndex) {
      randomIndex = Math.floor(Math.random() * phrases.length)
    }

    return randomIndex
  }, [phrases.length])

  const stopPlayback = useCallback(() => {
    playerRef.current.stop()
    setIsPlaying(false)
    setCurrentRepeat(0)
    setWaitSecondsLeft(null)
    setActiveWordIndex(-1)
  }, [])

  const handleRecord = useCallback(() => {
    if (!currentPhrase) return

    const key = `${currentSentence}__${activeLanguage}`

    // Cancel pending start or active recognition
    if (isRecordingFor !== null) {
      if (startTimeoutRef.current !== null) {
        clearTimeout(startTimeoutRef.current)
        startTimeoutRef.current = null
      }
      stopRecognitionRef.current?.()
      stopRecognitionRef.current = null
      setIsRecordingFor(null)
      return
    }

    setPronunciationRecord(null)
    setPronunciationErrorRecord(null)

    // Stop TTS if playing so the mic doesn't capture the synthesized voice.
    // Wait 600 ms for audio output to fully stop before opening the mic.
    const wasPlaying = isPlaying
    if (wasPlaying) {
      playerRef.current.stop()
      setIsPlaying(false)
      setCurrentRepeat(0)
      setWaitSecondsLeft(null)
    }

    setIsRecordingFor(key)

    startTimeoutRef.current = setTimeout(() => {
      startTimeoutRef.current = null
      const stop = startRecognition(
        getSpeechLocale(activeLanguage),
        (recognized) => {
          stopRecognitionRef.current = null
          setIsRecordingFor(null)
          setPronunciationRecord({ key, result: scorePronunciation(recognized, currentSentence) })
        },
        (errCode) => {
          stopRecognitionRef.current = null
          setIsRecordingFor(null)
          setPronunciationErrorRecord({
            key,
            message: errCode === 'not-allowed' ? labels.micError : labels.recognitionFailed,
          })
        },
      )
      stopRecognitionRef.current = stop
    }, wasPlaying ? 600 : 0)
  }, [activeLanguage, currentPhrase, currentSentence, isPlaying, isRecordingFor, labels.micError, labels.recognitionFailed])

  const playPhrase = useCallback((phraseIndex: number, sentIdx: number) => {
    const phrase = phrases[phraseIndex]
    const sentences = splitIntoSentences(phrase.text)
    const sentenceText = sentences[sentIdx] ?? phrase.text
    const wordOffset = sentenceWordOffset(sentences, sentIdx)

    setError(null)
    setIsPlaying(true)
    setCurrentIndex(phraseIndex)
    setSentenceIndex(sentIdx)

    playerRef.current.play({
      text: sentenceText,
      language: getSpeechLocale(activeLanguage),
      voiceURI: settingsRef.current.voiceByLanguage[activeLanguage],
      volume: settingsRef.current.volume,
      rate: settingsRef.current.rate,
      repetitions: settingsRef.current.repetitions,
      intervalSeconds: settingsRef.current.intervalSeconds,
      getRate: () => {
        if (!settingsRef.current.randomSpeed) {
          return settingsRef.current.rate
        }

        const randomRateOptions = [0.4, 0.6, 0.8, 1.0, 1.2]
        const previousRate = lastRandomRateRef.current
        const availableOptions =
          previousRate === null
            ? randomRateOptions
            : randomRateOptions.filter((rateOption) => rateOption !== previousRate)
        const nextRate = availableOptions[Math.floor(Math.random() * availableOptions.length)]

        lastRandomRateRef.current = nextRate
        return nextRate
      },
      getRepetitions: () => settingsRef.current.repetitions,
      getIntervalSeconds: () => settingsRef.current.intervalSeconds,
      onProgress: (current) => setCurrentRepeat(current),
      onIntervalStart: (secondsLeft) => { setWaitSecondsLeft(secondsLeft); setActiveWordIndex(-1) },
      onIntervalTick: (secondsLeft) => setWaitSecondsLeft(secondsLeft),
      onIntervalEnd: () => setWaitSecondsLeft(null),
      onDone: () => {
        setIsPlaying(false)
        setCurrentRepeat(0)
        setWaitSecondsLeft(null)
        setActiveWordIndex(-1)

        const nextSentIdx = sentIdx + 1
        if (nextSentIdx < sentences.length) {
          // More sentences in this paragraph — play next
          playPhraseRef.current(phraseIndex, nextSentIdx)
          return
        }

        if (settingsRef.current.autoAdvance) {
          const nextIndex = settingsRef.current.randomPhrases
            ? getRandomPhraseIndex(phraseIndex)
            : (phraseIndex + 1) % phrases.length
          playPhraseRef.current(nextIndex, 0)
        }
      },
      onError: (errorCode) => {
        setError(errorCode === 'unsupported' ? labels.ttsUnsupported : labels.ttsPlaybackFailed)
        setIsPlaying(false)
        setCurrentRepeat(0)
        setWaitSecondsLeft(null)
        setActiveWordIndex(-1)
      },
      onBoundary: (wordIndex) => setActiveWordIndex(wordOffset + wordIndex),
    })
  }, [activeLanguage, getRandomPhraseIndex, labels.ttsPlaybackFailed, labels.ttsUnsupported, phrases])

  useEffect(() => {
    playPhraseRef.current = playPhrase
  }, [playPhrase])

  const startPlayback = useCallback(() => {
    if (!currentPhrase) {
      return
    }

    playPhrase(safeCurrentIndex, 0)
  }, [currentPhrase, playPhrase, safeCurrentIndex])

  const handleRateChange = useCallback((newRate: number) => {
    // Sync ref immediately so playPhrase picks up the new rate without waiting for the effect
    settingsRef.current = { ...settingsRef.current, rate: newRate }
    onSettingsChange({ rate: newRate })
    if (isPlaying) {
      stopPlayback()
      playPhraseRef.current(safeCurrentIndex, sentenceIndex)
    }
  }, [isPlaying, onSettingsChange, safeCurrentIndex, sentenceIndex, stopPlayback])

  const handleNextPhrase = useCallback(() => {
    if (!hasPhrases) {
      return
    }

    stopPlayback()
    const nextIndex = settings.randomPhrases
      ? getRandomPhraseIndex(safeCurrentIndex)
      : (safeCurrentIndex + 1) % phrases.length
    playPhrase(nextIndex, 0)
  }, [getRandomPhraseIndex, hasPhrases, phrases, playPhrase, safeCurrentIndex, settings.randomPhrases, stopPlayback])

  const handlePreviousPhrase = useCallback(() => {
    if (!hasPhrases) {
      return
    }

    stopPlayback()
    const previousIndex = settings.randomPhrases
      ? getRandomPhraseIndex(safeCurrentIndex)
      : (safeCurrentIndex - 1 + phrases.length) % phrases.length
    playPhrase(previousIndex, 0)
  }, [getRandomPhraseIndex, hasPhrases, phrases, playPhrase, safeCurrentIndex, settings.randomPhrases, stopPlayback])

  useEffect(() => {
    playbackControlsRef.current = {
      isPlaying,
      startPlayback,
      stopPlayback,
      nextPhrase: handleNextPhrase,
      previousPhrase: handlePreviousPhrase,
    }
  }, [handleNextPhrase, handlePreviousPhrase, isPlaying, startPlayback, stopPlayback])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingContext =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable

      if (isTypingContext) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        if (playbackControlsRef.current.isPlaying) {
          playbackControlsRef.current.stopPlayback()
        } else {
          playbackControlsRef.current.startPlayback()
        }

        return
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault()
        playbackControlsRef.current.nextPhrase()
        return
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault()
        playbackControlsRef.current.previousPhrase()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <section className="card">
      <div className="practiceHeader">
        <h2>{labels.practiceTitle}</h2>
        <select
          className="practiceLanguageSelect"
          value={activeLanguage}
          onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
          aria-label={labels.practiceLanguage}
          title={labels.practiceLanguage}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {getLocalizedLanguageName(settings.nativeLanguage, option.code)}
            </option>
          ))}
        </select>
      </div>

      <div className="phraseBox">
        {currentPhrase ? (
          <>
            <p className="phraseText">
              {currentPhrase.text.split(' ').map((word, i) => (
                <span key={i} className={i === activeWordIndex ? 'phraseWord phraseWordActive' : 'phraseWord'}>{word}</span>
              ))}
            </p>
            <p className="phraseMeta">{resolvedTranslation ?? labels.translationUnavailable}</p>
          </>
        ) : (
          <p className="phraseText">{labels.noPhrases}</p>
        )}
        <div className="phraseNotices">
          {statusText && <span className="phraseStatus">{statusText}</span>}
          {error && <span className="phraseError">{error}</span>}
          {pronunciationError && <span className="phraseError">{pronunciationError}</span>}
        </div>
      </div>

      <div className="controlLine">
        <div className="transportBlock">
          <div className="transportGroup">
            <button
              type="button"
              className="iconControlButton"
              onClick={handlePreviousPhrase}
              disabled={!hasPhrases}
              aria-label={labels.previous}
              title={labels.previous}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                <path d="M7 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M18 6L10 12L18 18V6Z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className="iconControlButton playButton"
              onClick={isPlaying ? stopPlayback : startPlayback}
              disabled={!hasPhrases || isRecordingFor !== null}
              aria-label={isPlaying ? labels.stop : labels.listenRepeat}
              title={isPlaying ? labels.stop : labels.listenRepeat}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                  <rect x="7" y="6" width="4" height="12" rx="1" fill="currentColor" />
                  <rect x="13" y="6" width="4" height="12" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                  <path d="M8 6L18 12L8 18V6Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="iconControlButton"
              onClick={handleNextPhrase}
              disabled={!hasPhrases}
              aria-label={labels.next}
              title={labels.next}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                <path d="M17 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M6 6L14 12L6 18V6Z" fill="currentColor" />
              </svg>
            </button>
            {speechSupported && hasPhrases && (
              <>
                <button
                  type="button"
                  className={isRecording ? 'autoToggle isRecording' : 'autoToggle'}
                  onClick={handleRecord}
                  aria-label={isRecording ? labels.stopRecording : labels.recordPronunciation}
                  title={isRecording ? labels.stopRecording : labels.recordPronunciation}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                    {isRecording ? (
                      <rect x="7" y="6" width="10" height="12" rx="2" fill="currentColor" />
                    ) : (
                      <>
                        <rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor" />
                        <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                        <line x1="12" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </button>
                {speechSupported && hasPhrases && (
                  <span
                    className={pronunciationResult ? `scoreDot score-${pronunciationResult}` : 'scoreDot'}
                    aria-label={pronunciationResult ?? ''}
                  />
                )}
              </>
            )}
          </div>

        </div>

        <div className="miniFields">
          <div className="toggleColumn">
            <div className="toggleRow">
            <button
              type="button"
              className={settings.autoAdvance ? 'autoToggle smallToggle isActive' : 'autoToggle smallToggle'}
              onClick={() => onSettingsChange({ autoAdvance: !settings.autoAdvance })}
              aria-label={settings.autoAdvance ? labels.autoAdvanceOn : labels.autoAdvanceOff}
              title={settings.autoAdvance ? labels.autoAdvanceOn : labels.autoAdvanceOff}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                <path d="M6 7L11 12L6 17V7Z" fill="currentColor" />
                <path d="M12 7L17 12L12 17V7Z" fill="currentColor" />
                <path d="M19 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={settings.randomPhrases ? 'autoToggle smallToggle isActive' : 'autoToggle smallToggle'}
              onClick={() => onSettingsChange({ randomPhrases: !settings.randomPhrases })}
              aria-label={settings.randomPhrases ? labels.randomPhrasesOn : labels.randomPhrasesOff}
              title={settings.randomPhrases ? labels.randomPhrasesOn : labels.randomPhrasesOff}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                <path d="M6 8H8L10 10L14 14L16 16H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M15 6H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M6 16H8L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M15 18H18V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
            <button
              type="button"
              className={settings.randomSpeed ? 'autoToggle smallToggle isActive' : 'autoToggle smallToggle'}
              onClick={() => onSettingsChange({ randomSpeed: !settings.randomSpeed })}
              aria-label={settings.randomSpeed ? labels.randomSpeedOn : labels.randomSpeedOff}
              title={settings.randomSpeed ? labels.randomSpeedOn : labels.randomSpeedOff}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="iconGlyph">
                <path d="M4 16H8L11 8L14 16L17 10L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
            </div>
          </div>

          <label className="field compactField miniField">
            <span>{labels.speed}: {settings.randomSpeed ? '~' : `${settings.rate.toFixed(2)}x`}</span>
            <input
              type="range"
              min={0.4}
              max={1.2}
              step={0.2}
              value={settings.rate}
              disabled={settings.randomSpeed}
              onChange={(event) => handleRateChange(Number(event.target.value))}
            />
          </label>

          <label className="field compactField miniField">
            <span>{labels.repetitions}: {settings.repetitions}</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.repetitions}
              onChange={(event) => onSettingsChange({ repetitions: Number(event.target.value) })}
            />
          </label>

          <label className="field compactField miniField">
            <span>{labels.interval}: {settings.intervalSeconds}</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.intervalSeconds}
              onChange={(event) => onSettingsChange({ intervalSeconds: Number(event.target.value) })}
            />
          </label>
        </div>
      </div>

    </section>
  )
}
