# GitHub Copilot — Workspace Instructions

## Project overview
Language learning web app using the shadowing technique. React 19 + Vite 7 + TypeScript 5.9. No external state managers, no CSS framework, no test runner. All browser APIs are accessed through thin typed wrappers in `src/services/`.

## Code style & conventions

- **TypeScript strict mode** — no `any`, no type assertions unless unavoidable
- **Named exports only** — no default exports except `App` (required by Vite entry)
- **No barrel `index.ts` re-exports** — import directly from the file that owns the symbol
- **No external UI libraries** — all components are plain HTML + CSS classes in `src/index.css`
- **Functional components only** — no class components
- **`useCallback` / `useMemo`** — used consistently in page components to keep ref-based callbacks stable
- **CSS class naming** — camelCase, BEM-inspired: block (`phraseBox`), element (`phraseText`), modifier (`isActive`, `isPlaying`)
- **All user-visible strings go through `src/i18n/ui.ts`** — never hardcode text in JSX

## Architecture rules

### State ownership
- Global state (settings, phrases, active language, active tab) lives in `App.tsx`
- Page-local state (playback status, textarea value, draft voice) lives in the page component
- No React Context — pass props down

### Effects
- **Never call `setState` synchronously inside a `useEffect` body** — use the "adjust during render" pattern instead (see `PracticePage.tsx` `trackedPhraseIndex` as reference)
- Effects that register global listeners (`window.addEventListener`) must return a cleanup function
- Effects that depend on a ref (e.g. `playerRef`) do not need the ref in the dependency array

### Refs
- `useRef` is used to hold: mutable objects that survive re-renders (`ShadowingPlayer`), stable callback snapshots (`playPhraseRef`, `playbackControlsRef`), and DOM nodes
- Never read a ref and branch on it inside JSX — derive display values from state

### Services
- All services are pure functions or plain classes — no React imports
- `ShadowingPlayer` is a class because it holds mutable timer state; instantiate once with `useRef(new ShadowingPlayer())`
- All Web API access (`speechSynthesis`, `SpeechRecognition`, `localStorage`) goes through `src/services/` — never access these directly in components

## Adding a new language
1. `src/types/language.ts` — add code to `LanguageCode` union and entry to `LANGUAGE_OPTIONS`
2. `src/services/speechLocale.ts` — add BCP-47 locale
3. `src/services/translationService.ts` — add MyMemory language code
4. `src/i18n/ui.ts` — add translations for **all** existing label keys
5. `src/data/phrases/` — add JSON file with ~10 aligned phrases
6. `src/data/randomPhrasePool.ts` — add ~50 phrases

## Adding a new setting
1. `src/types/settings.ts` — add field to `AppSettings` and `DEFAULT_SETTINGS`
2. `src/services/settingsStorage.ts` — handle in `normalizeSettings()` so old saved data doesn't break
3. `App.tsx` — pass updated setting to the right page via props
4. `src/i18n/ui.ts` — add label keys if the setting needs UI text

## Adding new UI labels
Every label must be added to **all 9 languages** in `src/i18n/ui.ts`. The return type of `getUILabels()` is fully typed — TypeScript will error if any language is missing a key.

## Key files quick reference

| File | Purpose |
|---|---|
| `src/App.tsx` | Root: tab routing, global state, settings/phrase persistence |
| `src/pages/PracticePage.tsx` | Main practice UI: playback, highlight, recording, sliders |
| `src/pages/SettingsPage.tsx` | Settings UI: phrase editor, voice selector, save/restore |
| `src/services/shadowingPlayer.ts` | TTS engine: repetitions, interval countdown, word boundaries |
| `src/services/sentenceSplitter.ts` | Auto-split long phrases for sentence-by-sentence playback |
| `src/services/pronunciationScore.ts` | Word-level F1 score for pronunciation feedback |
| `src/services/translationService.ts` | MyMemory API client with localStorage cache |
| `src/i18n/ui.ts` | All UI strings in all 9 languages |
| `src/index.css` | All styles — single file, no CSS modules |

## What NOT to do
- Do not install new npm dependencies without a strong reason — the app intentionally has minimal deps
- Do not create CSS modules or styled-components — use `src/index.css`
- Do not add a global state manager
- Do not add a router — the app has two tabs, handled with a simple `useState`
- Do not use `any` or `// @ts-ignore`
- Do not hardcode language-specific logic outside of `src/services/speechLocale.ts` or `src/i18n/ui.ts`
