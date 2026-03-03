export interface PlayPhraseOptions {
  text: string
  language: string
  voiceURI?: string
  volume: number
  rate: number
  repetitions: number
  intervalSeconds: number
  getRate?: () => number
  getRepetitions?: () => number
  getIntervalSeconds?: () => number
  onProgress?: (current: number, total: number) => void
  onIntervalStart?: (secondsLeft: number) => void
  onIntervalTick?: (secondsLeft: number) => void
  onIntervalEnd?: () => void
  onDone?: () => void
  onError?: (errorCode: 'unsupported' | 'playback') => void
  onBoundary?: (wordIndex: number) => void
}

export class ShadowingPlayer {
  private isStopped = false
  private countdownIntervalId: number | null = null
  private wordTimerId: number | null = null
  private playbackId = 0

  isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  private clearWordTimer() {
    if (this.wordTimerId !== null) {
      window.clearTimeout(this.wordTimerId)
      this.wordTimerId = null
    }
  }

  stop() {
    if (!this.isSupported()) {
      return
    }

    this.isStopped = true
    this.playbackId += 1
    this.clearWordTimer()

    if (this.countdownIntervalId !== null) {
      window.clearInterval(this.countdownIntervalId)
      this.countdownIntervalId = null
    }

    window.speechSynthesis.cancel()
  }

  play(options: PlayPhraseOptions) {
    if (!this.isSupported()) {
      options.onError?.('unsupported')
      return
    }

    this.stop()
    this.isStopped = false
    const activePlaybackId = this.playbackId

    // Split into words, preserving original text positions
    const words = options.text.split(/\s+/).filter(Boolean)
    const wordStarts: number[] = []
    let searchFrom = 0
    for (const word of words) {
      const idx = options.text.indexOf(word, searchFrom)
      wordStarts.push(idx)
      searchFrom = idx + word.length
    }

    const getRate = () => Math.min(1.4, Math.max(0.1, options.getRate?.() ?? options.rate))
    const getRepetitions = () => Math.max(1, Math.round(options.getRepetitions?.() ?? options.repetitions))
    const getIntervalSeconds = () => Math.max(0, options.getIntervalSeconds?.() ?? options.intervalSeconds)

    // Timer-based fallback: advance word highlight every ~msPerWord ms
    const startWordTimer = (rate: number) => {
      this.clearWordTimer()
      if (!options.onBoundary || words.length === 0) return

      // Estimate: ~3.5 words/sec at rate 1.0 → ms per word ≈ 285 / rate
      // Add a small constant for pauses between words
      const msPerWord = Math.round(290 / rate)
      let wordIdx = 0

      const advance = () => {
        if (this.isStopped || activePlaybackId !== this.playbackId) return
        options.onBoundary!(wordIdx)
        wordIdx++
        if (wordIdx < words.length) {
          this.wordTimerId = window.setTimeout(advance, msPerWord)
        }
      }

      this.wordTimerId = window.setTimeout(advance, 0)
    }

    const speakOnce = (current: number) => {
      if (this.isStopped || activePlaybackId !== this.playbackId) {
        return
      }

      const total = getRepetitions()

      if (current > total) {
        options.onDone?.()
        return
      }

      options.onProgress?.(current, total)

      const utterance = new SpeechSynthesisUtterance(options.text)
      utterance.lang = options.language
      if (options.voiceURI) {
        const matchingVoice = window.speechSynthesis
          .getVoices()
          .find((voice) => voice.voiceURI === options.voiceURI)

        if (matchingVoice) {
          utterance.voice = matchingVoice
        }
      }
      utterance.volume = options.volume
      const currentRate = getRate()
      utterance.rate = currentRate

      // Use onboundary if available, otherwise rely on timer started in onstart
      let boundaryFired = false
      utterance.onboundary = (event) => {
        if (event.name !== 'word') return
        boundaryFired = true
        this.clearWordTimer()
        // Find word index by charIndex
        let idx = words.length - 1
        for (let i = 0; i < wordStarts.length; i++) {
          if (event.charIndex <= wordStarts[i]) { idx = i; break }
        }
        options.onBoundary?.(Math.max(0, idx))
      }

      utterance.onstart = () => {
        if (this.isStopped || activePlaybackId !== this.playbackId) return
        // Start timer fallback; if onboundary fires first it will clear this
        window.setTimeout(() => {
          if (!boundaryFired) {
            startWordTimer(currentRate)
          }
        }, 200)
      }

      utterance.onend = () => {
        if (this.isStopped || activePlaybackId !== this.playbackId) {
          return
        }

        this.clearWordTimer()
        const latestTotal = getRepetitions()

        if (current < latestTotal) {
          options.onBoundary?.(-1)
          const initialInterval = getIntervalSeconds()

          if (initialInterval <= 0) {
            options.onIntervalEnd?.()
            speakOnce(current + 1)
            return
          }

          const startedAt = Date.now()
          options.onIntervalStart?.(initialInterval)

          this.countdownIntervalId = window.setInterval(() => {
            if (this.isStopped || activePlaybackId !== this.playbackId) {
              if (this.countdownIntervalId !== null) {
                window.clearInterval(this.countdownIntervalId)
                this.countdownIntervalId = null
              }
              return
            }

            const elapsedMs = Date.now() - startedAt
            const latestIntervalSeconds = getIntervalSeconds()
            const remaining = Math.max(0, Number((latestIntervalSeconds - elapsedMs / 1000).toFixed(1)))
            options.onIntervalTick?.(remaining)

            if (remaining <= 0 && this.countdownIntervalId !== null) {
              window.clearInterval(this.countdownIntervalId)
              this.countdownIntervalId = null
              options.onIntervalEnd?.()
              speakOnce(current + 1)
            }
          }, 100)

          return
        }

        options.onDone?.()
      }

      utterance.onerror = (event) => {
        if (this.isStopped || activePlaybackId !== this.playbackId) {
          return
        }

        if (event.error === 'canceled' || event.error === 'interrupted') {
          return
        }

        options.onError?.('playback')
      }

      window.speechSynthesis.speak(utterance)
    }

    speakOnce(1)
  }
}
