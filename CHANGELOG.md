# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [0.1.0] — 2026-03-03

### Added

#### Core practice flow
- TTS playback via Web Speech API with configurable repetitions (1–5), speed (0.2–1.4×) and interval between repetitions (1–5 s)
- Real-time slider adjustments take effect on the next repetition without restarting playback
- Auto-advance mode: automatically moves to the next phrase when playback of all repetitions finishes
- Random phrase order mode
- Random speed mode: cycles through 0.8×, 1.0×, 1.2×, 1.4× without repeating the same speed consecutively
- Keyboard shortcuts: `Space` (play/stop), `ArrowRight` (next), `ArrowLeft` (previous)
- Previous / next navigation buttons
- Phrase counter status during playback (`1/3`, `2/3`, …)

#### Sentence splitting
- Long phrases are automatically split on punctuation boundaries (`.?!。？！`) and played sentence by sentence
- Word highlight offset spans the full phrase text regardless of which sentence is playing
- Sentence progress indicator (`1/2`, `2/2`) displayed only when a phrase has more than one sentence

#### Word highlight during TTS
- Active word highlighted in blue during TTS playback
- Dual strategy: native `onboundary` event (Chrome/Edge) with automatic timer fallback (Firefox/Safari) at `≈290/rate` ms per word

#### Pronunciation scoring
- Microphone recording button in the transport bar (hidden when `SpeechRecognition` is unavailable)
- Word-level F1 score comparing recognized speech to the target phrase
- Color-coded score dot: green (≥ 0.85), yellow (≥ 0.55), red (< 0.55)
- 600 ms TTS-stop guard before opening the microphone

#### Translation
- Automatic translation of phrases to the native language via MyMemory API
- Translation result cached in `localStorage` to avoid redundant API calls
- Cache sanitized on app load to remove obsolete language entries

#### Settings — phrase editor
- Textarea with monospace font, soft line wrap and spell-check (uses target language locale)
- Save, clear, random fill (+10 unique phrases) and restore-defaults actions (icon-only buttons with tooltips)
- Visual save feedback: button flash, inline status message
- Unsaved-changes guard on tab switch and language change

#### Settings — voice selector
- Compact inline voice selector placed next to the save button
- Voice preview plays automatically when a voice is selected
- Voice change is a draft — only persisted when the user clicks Save

#### Internationalization
- Full UI translated in 9 languages: `pt`, `en`, `es`, `de`, `fr`, `it`, `ja`, `zh`, `ko`
- Native language selector in the top bar; target language selector in each tab header
- All labels, tooltips, confirmation dialogs and error messages are localized

#### Phrase data
- 10 default aligned phrases per language for initial practice and fallback
- Pool of 50 phrases per language for random fill

#### Persistence
- `AppSettings` serialized to `localStorage` with automatic migration/normalization on load
- Custom phrase bank stored per language
- Preferred voice stored per language alongside settings

#### Developer experience
- `.github/copilot-instructions.md` — architecture rules and conventions for AI-assisted development
- `.github/CONTRIBUTING.md` — setup guide, branch/commit conventions, PR checklist
- `.github/pull_request_template.md` — PR template with automated checklist
