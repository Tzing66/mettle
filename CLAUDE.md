@AGENTS.md

# Mettle

Gamified workout tracker: consistency earns steady XP, real progress earns big XP, users climb E → S rank.
`plan.md` is the product spec and roadmap. Read the relevant section before building a feature, and tick off roadmap items when they're done.

## Stack
Expo SDK 57 (React Native 0.86, TypeScript, React Compiler on) · expo-router (routes in `src/app/`) · Reanimated 4 · expo-haptics · expo-sqlite + drizzle-orm 0.45 · zustand · Jest (jest-expo) · StyleSheet + design tokens (no NativeWind), Inter font, "Sage & stone" palette. Runs in Expo Go on iOS and Android.

## Layout
```
src/app/            routes only (expo-router). (tabs)/ = Home, History, Profile
src/engine/         PURE TypeScript: XP, ranks, e1RM, records, streaks, benchmarks, plausibility
  __tests__/        Jest tests (*.test.ts); fixtures.ts holds shared test data
src/db/             schema.ts (drizzle), client.ts, migrations/ (generated, don't hand-edit)
src/design/         tokens.ts, haptics.ts, components/, icons/
src/features/       UI + hooks per feature (Phase 1+)
config/             versioned JSON: xp-rules.v1, ranks.v1, benchmarks.v1
```

## Rules
- **Engine is pure.** Nothing in `src/engine` may import React, React Native, Expo or the DB. No clock reads: time comes in as arguments. Every rule change gets a test; write the engine test before the UI.
- **Units:** store kg / metres / seconds and epoch-ms timestamps. Convert only for display (`engine/units.ts`).
- **Config, not code:** tunable numbers live in `config/*.json`. A behaviour change means a new version string (`xp-rules.v2`), not an edit to v1's meaning.
- **XP is an append-only ledger** (`xp_events`). Never update or delete amounts; rebalancing adds events. Every event carries `rule_version`.
- **Design tokens only:** no hex colours, font names or magic spacing in components or screens. Read them from `src/design/tokens.ts`.
- **Animations never block input:** short springs (150–300 ms), `pointerEvents="none"` on overlays, haptics are fire-and-forget. Full-screen celebrations only for rank-ups.
- **Reanimated + React Compiler:** use `sv.get()` / `sv.set()`, not `sv.value`. Use `scheduleOnRN` from `react-native-worklets` to call JS from worklets.
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
