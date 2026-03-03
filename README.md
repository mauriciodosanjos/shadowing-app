# Shadowing App

Web application for language learning through the **shadowing technique** — listening to a phrase spoken by TTS and immediately repeating it aloud. Focused on short phrases, repetition control, pronunciation feedback and multilingual support.

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 19 |
| Build tool | Vite | 7 |
| Language | TypeScript | 5.9 |
| Speech synthesis | Web Speech API (`SpeechSynthesis`) | native browser |
| Speech recognition | Web Speech API (`SpeechRecognition`) | native browser |
| Translation | MyMemory REST API | — |
| Persistence | `localStorage` | — |
| Linter | ESLint + typescript-eslint + react-hooks | 9 |

No CSS framework, no state management library — vanilla React state + `localStorage`.

---

## Project structure

```
src/
├── App.tsx                        # Root component: tab routing, global state
├── main.tsx                       # React root mount
│
├── pages/
│   ├── PracticePage.tsx           # Practice tab — playback controls, phrase display, recording
│   └── SettingsPage.tsx           # Settings tab — phrase editor, voice selector, save/restore
│
├── services/
│   ├── shadowingPlayer.ts         # TTS engine wrapper (repetitions, interval, word boundaries)
│   ├── speechRecognition.ts       # Web Speech Recognition typed wrapper
│   ├── pronunciationScore.ts      # F1-based pronunciation scoring
│   ├── sentenceSplitter.ts        # Auto-split long phrases into sentences for playback
│   ├── translationService.ts      # MyMemory API client with localStorage cache
│   ├── phraseStorage.ts           # Phrase CRUD: parse/format textarea, random pool
│   ├── settingsStorage.ts         # Load/save/normalize AppSettings from localStorage
│   ├── voiceCatalog.ts            # Filter/label available TTS voices by language
│   └── speechLocale.ts            # Map LanguageCode → BCP-47 locale string
│
├── i18n/
│   └── ui.ts                      # All UI labels in 9 languages (pure record lookup)
│
├── types/
│   ├── language.ts                # LanguageCode union + LANGUAGE_OPTIONS array
│   ├── phrases.ts                 # PhraseEntry interface
│   └── settings.ts                # AppSettings interface + DEFAULT_SETTINGS
│
└── data/
    ├── phrases/
    │   ├── index.ts               # Re-exports all phrase JSON files
    │   └── *.json                 # 10 aligned phrases per language (training + fallback)
    └── randomPhrasePool.ts        # 50 phrases per language for random fill
```

---

## Architecture decisions

### No external state manager
All state lives in React `useState`/`useRef` inside each page component. Global state (settings, phrases, active language) is owned by `App.tsx` and passed as props. No Redux, Zustand or Context API.

### Refs for stable callbacks in effects
`playPhraseRef` and `playbackControlsRef` in `PracticePage` hold the latest version of callbacks used inside `addEventListener` (keyboard shortcuts) and TTS `onDone` handlers — avoiding stale closure bugs without adding those functions to dependency arrays.

### Adjust-during-render instead of setState in effects
When `safeCurrentIndex` changes, `sentenceIndex` and `activeWordIndex` are reset using the "adjust during render" React pattern (compare a tracked value, call setState synchronously during render if different). This avoids the cascading render issue that `useEffect(() => setState(...), [dep])` causes.

### ShadowingPlayer as a class
`shadowingPlayer.ts` is a plain class (not a hook) because it holds mutable playback state (`isStopped`, `playbackId`, `countdownIntervalId`, `wordTimerId`) that must survive re-renders. It is instantiated once via `useRef`.

### Word boundary highlight — dual strategy
1. **Native** (`utterance.onboundary`): fires per word with `charIndex`. Used on Chrome/Edge.
2. **Timer fallback**: if `onboundary` hasn't fired within 200 ms of `onstart`, a timer advances word index every `≈290/rate` ms. Used on Firefox and Safari.

### Sentence splitting is transparent
`splitIntoSentences()` only affects playback chunking — the full phrase text is always displayed. Word highlight offsets are computed with `sentenceWordOffset()` to span the full word array regardless of which sentence is playing.

---

## Supported languages

`pt` · `en` · `es` · `de` · `fr` · `it` · `ja` · `zh` · `ko`

Adding a new language requires changes in six places:
1. `src/types/language.ts` — add to `LanguageCode` union and `LANGUAGE_OPTIONS`
2. `src/services/speechLocale.ts` — add BCP-47 locale mapping
3. `src/services/translationService.ts` — add MyMemory API code mapping
4. `src/i18n/ui.ts` — add all UI label keys for the new language
5. `src/data/phrases/` — add a JSON file with ~10 phrases
6. `src/data/randomPhrasePool.ts` — add ~50 phrases

---

## localStorage keys

| Key | Content |
|---|---|
| `shadowing-app-settings` | Serialized `AppSettings` JSON |
| `shadowing-app-custom-phrases` | `Record<LanguageCode, string[]>` |
| `shadowing-app-translation-cache` | `Record<string, string>` — key format: `sourceLang__targetLang__text` |

Settings are normalized on load (`normalizeSettings`) to handle missing/invalid fields from older versions.

---

## Services reference

### `shadowingPlayer.ts`
- `ShadowingPlayer.play(options)` — plays a phrase with repetitions, interval countdown, word boundary events
- `ShadowingPlayer.stop()` — cancels TTS and all timers immediately
- Key options: `getRate`, `getRepetitions`, `getIntervalSeconds` — called per repetition so live slider changes take effect mid-session

### `sentenceSplitter.ts`
- `splitIntoSentences(text)` — splits on `.?!。？！`; returns `[text]` unchanged if fewer than 2 parts found
- `sentenceWordOffset(sentences, sentIdx)` — word count before sentence `sentIdx` (for highlight offset)

### `pronunciationScore.ts`
- `scorePronunciation(recognized, target)` — normalizes both strings (lowercase, strip punctuation), computes word-level F1 score
- Thresholds: `≥0.85` → `good`, `≥0.55` → `medium`, `<0.55` → `poor`

### `translationService.ts`
- `translatePhrase(text, source, target)` — checks localStorage cache first, then calls MyMemory API
- Cache is sanitized on load to remove obsolete language codes from earlier app versions

### `phraseStorage.ts`
- `parsePhrasesFromTextarea(text)` — splits by `\n`, trims, removes empty lines
- `buildPhraseEntries(language, customBank)` — merges custom phrases with aligned JSON defaults; custom phrases only have the training language field set (no pre-defined translations)

---

## Browser compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| TTS (`SpeechSynthesis`) | ✅ | ✅ | ✅ | ✅ |
| Word boundaries (`onboundary`) | ✅ | ❌ (timer fallback) | ❌ (timer fallback) | ✅ |
| Speech recognition | ✅ | ❌ | ✅ (iOS/macOS) | ✅ |

The mic/record button is hidden when `isSpeechRecognitionSupported()` returns false.

---

## Development

```bash
npm install
npm run dev       # start dev server at http://localhost:5173
npm run build     # type-check + Vite production build → dist/
npm run lint      # ESLint with react-hooks rules
npm run preview   # serve dist/ locally
```

No test runner is currently configured.

---

## Roadmap

- Import/export custom phrases per language (`.txt` / `.json`)
- Simple session history (practice time, completed phrases)
- Spaced-repetition review mode for hard phrases
- Optional cloud backup sync
