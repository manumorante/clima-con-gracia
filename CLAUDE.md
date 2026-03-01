# CLAUDE.md — Clima con Gracia

AI assistant reference for the **Clima con Gracia** codebase. Read this before making changes.

---

## Project Overview

A Spanish-language weather web app that fetches real-time weather data and generates witty, context-aware descriptions of current conditions. Built with vanilla TypeScript and Vite — no framework.

**Live data sources:** OpenMeteo (free, no API key required)

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Vite | 7.3.1 | Dev server + bundler |
| TypeScript | 5.9.3 | Language (strict mode) |
| Tailwind CSS | 4.2.1 | Styling (via `@tailwindcss/vite`) |

No testing framework. No ESLint/Prettier. TypeScript strict mode is the primary quality gate.

---

## Repository Structure

```
clima-con-gracia/
├── index.html              # HTML entry point (single page)
├── vite.config.ts          # Vite + Tailwind plugin config
├── tsconfig.json           # TypeScript strict config
├── package.json            # Scripts and dependencies
├── public/
│   └── vite.svg
└── src/
    ├── main.ts             # UI orchestration + DOM event handling
    ├── types.ts            # All shared TypeScript type definitions
    ├── weatherLogic.ts     # Pure business logic (analysis + phrase generation)
    ├── api/
    │   └── weatherApi.ts   # API calls (geocoding + weather fetch)
    ├── style.css           # Global styles (Tailwind entry point)
    ├── counter.ts          # Unused boilerplate — can be ignored/deleted
    └── typescript.svg      # Asset
```

---

## Architecture

### Data Flow

```
User input (city name or geolocation)
  → weatherApi.ts: resolveCity() / fetchWeatherByCoords()
  → types.ts: WeatherSnapshot (raw data)
  → weatherLogic.ts: analyzeWeather()
  → types.ts: WeatherAnalysis + WeatherReport
  → main.ts: buildReport() → viewReport() → DOM update
```

### Layer Responsibilities

**`types.ts`** — Single source of truth for all types. No logic.
- `ThermalLevel`: 8-level union (`freezing` → `extreme-hot`)
- `FeelsRelevance`: `none | relevant | dominant`
- `WeatherSnapshot`: Raw API data (temps, humidity, wind, WMO code)
- `WeatherAnalysis`: Processed output (thermal level, conditions, funny phrase)
- `WeatherReport`: Combined snapshot + analysis

**`api/weatherApi.ts`** — HTTP calls only. No business logic.
- `resolveCity(query)` → geocodes city name to `{ lat, lon, name }`
- `fetchWeatherByCoords(lat, lon)` → returns `WeatherSnapshot`
- `fetchWeatherByCity(query)` → combined convenience function
- Defensive parsing helpers: `isRecord()`, `readNumber()`, `readString()`

**`weatherLogic.ts`** — Pure functions, no side effects, no DOM.
- `analyzeWeather(snapshot)` → `WeatherAnalysis`
  - Classifies thermal level from apparent temperature
  - Applies adjustment rules (humidity escalates heat; wind de-escalates cold)
  - Maps WMO weather codes to Spanish descriptions
- `createFunnyPhrase(analysis)` → `string` (witty Spanish phrase)

**`main.ts`** — UI only. Coordinates API + logic, manages DOM.
- Event handlers: form submit, geolocation button, sliders, reset
- `buildReport()` — assembles `WeatherReport` from snapshot
- `viewReport()` — renders HTML from report data
- `syncSlidersWithSnapshot()` — keeps UI controls in sync with fetched data
- Single mutable state: `latestSnapshot` (closure variable)

---

## Development Commands

```bash
npm run dev        # Start Vite dev server with HMR (localhost:5173)
npm run build      # tsc + vite build → /dist
npm run preview    # Serve /dist locally
```

**Build order:** TypeScript type-check runs first (`tsc`), then Vite bundles. A type error will fail the build.

---

## TypeScript Conventions

Strict mode is fully enabled. Key active compiler flags:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedSideEffectImports": true
}
```

**Rules to follow:**
- No `any` types — use proper types or type guards
- No unused variables or parameters — the compiler will reject them
- Use the existing defensive parsing helpers (`isRecord`, `readNumber`, `readString`) when consuming external API data
- Prefer discriminated union types for multi-state values (see `ThermalLevel`)

---

## Key Conventions

### Language
- **Code identifiers:** English (functions, variables, types, file names)
- **User-facing text:** Spanish (UI labels, weather descriptions, error messages, funny phrases)
- API calls include `language=es` and `timezone=auto` parameters

### Immutability
- Prefer pure functions — `analyzeWeather` and `createFunnyPhrase` are pure
- Use spread operators for object transformation
- Avoid mutating function arguments

### HTML Generation
- Use template literals in `main.ts` to generate HTML strings
- Inject with `element.innerHTML = ...`
- Temperature values displayed to one decimal place (e.g., `23.4°C`)

### API Integration
- Base geocoding URL: `https://geocoding-api.open-meteo.com/v1/search`
- Base weather URL: `https://api.open-meteo.com/v1/forecast`
- No API keys needed — all public endpoints
- Geolocation timeout: 10 seconds

### Thermal Level System
The app classifies weather into 8 levels based on apparent temperature, then applies modifiers:
- High humidity (≥70%) + high heat (≥30°C apparent) → escalates thermal level
- High wind (≥35 km/h) + cold (≤10°C) → de-escalates perceived cold
- WMO codes are mapped in `weatherLogic.ts` to ~30 Spanish condition strings

---

## What Does Not Exist (Yet)

- No unit tests or test runner
- No ESLint or Prettier
- No environment variables (API URLs are hardcoded)
- No CI/CD pipeline
- No i18n infrastructure — Spanish only

When adding tests, **Vitest** is the natural fit (same ecosystem as Vite). Pure functions in `weatherLogic.ts` and `api/weatherApi.ts` are the best candidates.

---

## Git Workflow

- Feature branches follow the pattern: `claude/<description>-<id>`
- Remote: `origin` (proxied local Git server)
- Main branch on remote: `main`
- Always push with: `git push -u origin <branch-name>`

---

## Common Tasks

**Add a new weather condition:**
1. Find the WMO code mapping in `weatherLogic.ts`
2. Add the code and Spanish description to the conditions map
3. If it needs special phrase logic, update `createFunnyPhrase()`

**Change thermal level thresholds:**
- Edit the temperature ranges in `analyzeWeather()` in `weatherLogic.ts`
- Update `ThermalLevel` union type in `types.ts` if adding/removing levels

**Add a new UI field:**
1. Update `WeatherSnapshot` or `WeatherAnalysis` in `types.ts`
2. Populate the field in `weatherApi.ts` or `weatherLogic.ts`
3. Render it in `viewReport()` in `main.ts`

**Add a new API parameter:**
- Add the query parameter in `fetchWeatherByCoords()` in `api/weatherApi.ts`
- Add the corresponding field to `WeatherSnapshot` in `types.ts`
- Parse it with `readNumber()` or `readString()` in the response handler
