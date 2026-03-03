// Minimal typed interface for what we need from the Web Speech Recognition API
interface SRResult {
  readonly transcript: string
}

interface SRResultList {
  readonly length: number
  item(index: number): { item(index: number): SRResult }
  [index: number]: { item(index: number): SRResult; [n: number]: SRResult }
}

interface SRResultEvent {
  readonly results: SRResultList
}

interface SRErrorEvent {
  readonly error: string
}

interface SRInstance {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: SRResultEvent) => void) | null
  onerror: ((event: SRErrorEvent) => void) | null
  onnomatch: (() => void) | null
  start(): void
  stop(): void
}

type SRCtor = new () => SRInstance

function getSRCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const Ctor = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as SRCtor | undefined
  return Ctor ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSRCtor() !== null
}

export function startRecognition(
  lang: string,
  onResult: (text: string) => void,
  onError: (errorCode: string) => void,
): () => void {
  const Ctor = getSRCtor()
  if (!Ctor) {
    onError('unsupported')
    return () => {}
  }

  const recognition = new Ctor()
  recognition.lang = lang
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.continuous = false

  let settled = false

  recognition.onresult = (event) => {
    if (settled) return
    settled = true
    const transcript = event.results[0]?.[0]?.transcript ?? ''
    onResult(transcript.trim())
  }

  recognition.onerror = (event) => {
    if (settled) return
    settled = true
    onError(event.error)
  }

  recognition.onnomatch = () => {
    if (settled) return
    settled = true
    onError('no-speech')
  }

  recognition.start()

  return () => {
    try {
      recognition.stop()
    } catch {
      // ignore stop errors
    }
  }
}

