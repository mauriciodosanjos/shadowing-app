# Contributing

## Prerequisites

- Node.js 20+
- A modern browser (Chrome or Edge recommended for full Web Speech API support)

## Setup

```bash
git clone <repo>
cd shadowing-app
npm install
npm run dev
```

Dev server runs at `http://localhost:5173`.

## Before submitting a PR

```bash
npm run lint    # must pass with 0 errors
npm run build   # must exit 0
```

There is currently no test runner. Logic in `src/services/` should be testable as pure functions if a test suite is added in the future.

## Branch conventions

| Branch | Purpose |
|---|---|
| `main` | Stable, deployable |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Refactoring, tooling, deps |

## Commit style

Use conventional commits:

```
feat: add import/export for custom phrases
fix: prevent score dot flicker on phrase change
chore: remove unused CSS classes
```

## Project constraints

- **No new npm runtime dependencies** without prior discussion — the goal is to keep the dependency count minimal
- **Web APIs only** — do not use `node:fs`, `node:path` or server-side APIs; this is a purely client-side app
- **All user-visible strings must be translated** — add to all 9 languages in `src/i18n/ui.ts` or the TypeScript compiler will error
- **Lint must pass** — `react-hooks/exhaustive-deps` and `react-hooks/rules-of-hooks` are enforced; do not use `eslint-disable` unless genuinely necessary

## Code review checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] New user-visible strings added to all languages in `src/i18n/ui.ts`
- [ ] New settings fields handled in `normalizeSettings()` in `src/services/settingsStorage.ts`
- [ ] No `any` types introduced
- [ ] No direct `window.speechSynthesis` / `localStorage` access outside `src/services/`
