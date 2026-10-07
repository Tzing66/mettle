@AGENTS.md

# Mettle

Gamified workout tracker: consistency earns steady XP, real progress earns big XP, users climb E → S rank.
`plan.md` is the product spec and roadmap. It is **local only and gitignored: never commit or push it.** Read the relevant section before building a feature, and tick off roadmap items when they're done.

## Stack
Expo SDK 57 (React Native 0.86, TypeScript, React Compiler on) · expo-router (routes in `src/app/`) · Reanimated 4 · expo-haptics · expo-sqlite + drizzle-orm 0.45 · zustand · Jest (jest-expo) · StyleSheet + design tokens (no NativeWind), Inter font, "Sage & stone" palette. Runs in Expo Go on iOS and Android.

## Layout
```
src/app/            routes only (expo-router). (tabs)/ = Home, History, Profile
src/engine/         PURE TypeScript: XP, ranks, e1RM, records, streaks, benchmarks, plausibility
  __tests__/        Jest tests (*.test.ts); fixtures.ts holds shared test data
src/db/             schema.ts (drizzle), client.ts, seed.ts, useDbQuery.ts, repositories/, migrations/ (generated)
  __tests__/        integration tests on real SQLite (better-sqlite3 stands in for expo-sqlite)
src/design/         tokens.ts, haptics.ts, components/, icons/
src/features/       feature UI + glue: workout/ (finishWorkout service, store, cards), home/, history/, profile/, format.ts
config/             versioned JSON: xp-rules.v1, ranks.v1, benchmarks.v1, exercises.json (built by scripts/build-exercise-catalogue.mjs)
```

## Rules
- **Engine is pure.** Nothing in `src/engine` may import React, React Native, Expo or the DB. No clock reads: time comes in as arguments. Every rule change gets a test; write the engine test before the UI.
- **Data access:** SQLite is the source of truth, read synchronously. Screens read via `useDbQuery(read, tables)`, which re-reads when those tables change. Zustand holds only ephemeral UI state (rest timer, expanded row, last summary). `finishWorkout` loads inputs and calls the pure `finishSession` in the engine, then writes everything in one transaction.
- **Units:** store kg / metres / seconds and epoch-ms timestamps. Convert only for display (`engine/units.ts`).
- **Config, not code:** tunable numbers live in `config/*.json`. A behaviour change means a new version string (`xp-rules.v2`), not an edit to v1's meaning.
- **XP is an append-only ledger** (`xp_events`). Never update or delete amounts; rebalancing adds events. Every event carries `rule_version`.
- **Design tokens only:** no hex colours, font names or magic spacing in components or screens. Read them from `src/design/tokens.ts`.
- **Animations never block input:** short springs (150–300 ms), `pointerEvents="none"` on overlays, haptics are fire-and-forget. Full-screen celebrations only for rank-ups.
- **Reanimated + React Compiler:** use `sv.get()` / `sv.set()`, not `sv.value`. Use `scheduleOnRN` from `react-native-worklets` to call JS from worklets. Render must be pure: no `Date.now()` in render; compute it in the data read.
- **Originality:** our own icons and art. No Solo Leveling names or assets, and no copying other fitness apps.

## Commands
```bash
npm test              # engine tests
npm run typecheck     # tsc --noEmit
npx expo lint
npm run db:generate   # after editing src/db/schema.ts → new migration in src/db/migrations
npx expo start        # scan the QR with Expo Go
```
Run test + typecheck + lint before calling anything done.
