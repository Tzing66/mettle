@AGENTS.md

# Mettle

Gamified workout tracker: consistency earns steady XP, real progress earns big XP, users climb E → S rank. Offline-first phone app; optional account for backup, sync and friends' leaderboards.
`plan.md` is the product spec and roadmap. It is **local only and gitignored: never commit or push it.** Read the relevant section before building a feature, and tick off roadmap items when they're done.

## Stack
Expo SDK 57 (React Native 0.86, TypeScript, React Compiler on) · expo-router (routes in `src/app/`) · Reanimated 4 · expo-haptics · expo-sqlite + drizzle-orm 0.45 · zustand · Jest (jest-expo) · StyleSheet + design tokens (no NativeWind), Inter font, "Sage & stone" palette. Runs in Expo Go on iOS and Android (no web).
Cloud: Supabase (Postgres + RLS, Auth with Google/email code, one Edge Function). Project ref `slronrigxkbaijtkptug`, linked via the Supabase CLI. Client keys live in `.env.local` (gitignored; see `.env.example`).

## Layout
```
src/app/            routes only (expo-router). (tabs)/ = Home, History, Friends, Profile
src/engine/         PURE TypeScript: XP, ranks, e1RM, records, streaks, benchmarks, plausibility, session, replay
src/db/             schema.ts (drizzle), client.ts, seed.ts, useDbQuery.ts, repositories/, migrations/ (generated)
src/design/         tokens.ts, haptics.ts, components/, icons/ (incl. glyphs.ts exercise figures)
src/features/       feature glue: workout/, home/, history/, profile/, account/ (auth), sync/, social/ (groups), export/
src/server/         recompute.ts: server-side XP, bundled into the Edge Function (keep RN/Expo/DB-free)
src/test/           test helpers: sqliteDb (real SQLite for drizzle), fakeCloud (Supabase API stand-in)
config/             versioned JSON: xp-rules, ranks, benchmarks, exercises (generated), age-grading (generated)
scripts/            build-exercise-catalogue.mjs, build-age-grading.py, build-edge.mjs, preview-glyphs.ts
supabase/           migrations/ (cloud schema), functions/recompute-xp (+ _shared/recompute.js, generated)
```
Tests live next to code in `__tests__/` folders.

## Rules
- **Engine is pure.** Nothing in `src/engine` (or `src/server`) may import React, React Native, Expo or the DB. No clock reads: time comes in as arguments. Every rule change gets a test; write the engine test before the UI.
- **Sets are the source of truth; XP is derived.** The local ledger (`xp_events`), records and unlocks are rebuilt by replaying history (`engine/replay.ts`) after a sync, and the server re-scores the same sets for leaderboards. Never sync derived data. Every event carries `rule_version`.
- **Rules change → rebuild the server bundle.** After touching `src/engine`, `src/server` or `config/`, run `npm run build:edge` (a test fails if the bundle is stale) and deploy with `npm run deploy:edge`.
- **Data access:** SQLite is read synchronously. Screens read via `useDbQuery(read, tables)`, which re-reads when those tables change. Zustand holds only ephemeral UI state. Online-only data (groups, leaderboards) uses `useRemote`.
- **Sync:** SQLite triggers queue changes in `sync_outbox` once the phone is linked to an account; repositories never call sync directly. Cloud tables use server-stamped `updated_at` and soft deletes.
- **Cloud security:** every table has RLS; anything that writes on behalf of others is a `security definer` function with explicit grants. Never ship the service key in the app. Schema changes go in `supabase/migrations/` and are applied with `npx supabase db push`.
- **Units:** store kg / metres / seconds and epoch-ms timestamps. Convert only for display (`engine/units.ts`).
- **Config, not code:** tunable numbers live in `config/*.json`. A behaviour change means a new version string, not an edit to the old one's meaning.
- **Design tokens only, theme-aware:** no hex colours, font names or magic spacing in components or screens. Colours come from the light/dark themes via hooks: `const useStyles = makeStyles((colors) => ({…}))` at module level, `const styles = useStyles(); const { colors } = useTheme();` inside components (`src/design/theme.tsx`). Never import colours directly; the React Compiler would cache stale ones. Contrast is enforced by `src/design/__tests__/contrast.test.ts`.
- **Animations never block input:** short springs, `pointerEvents="none"` on overlays, haptics are fire-and-forget. Full-screen celebrations only for rank-ups.
- **Reanimated + React Compiler:** use `sv.get()` / `sv.set()`, not `sv.value`. Use `scheduleOnRN` from `react-native-worklets` to call JS from worklets. Render must be pure: no `Date.now()` in render; compute it in the data read.
- **Never commit secrets:** `.env.local`, Google `client_secret_*.json` and `plan.md` are gitignored.
- **Originality:** our own icons and art. No Solo Leveling names or assets, and no copying other fitness apps.

## Commands
```bash
npm test                 # all tests (engine, SQLite integration, sync, server)
npm run typecheck
npx expo lint
npm run db:generate      # after editing src/db/schema.ts → new local migration
npx supabase db push     # apply supabase/migrations to the cloud project
npm run deploy:edge      # rebuild + deploy the recompute-xp Edge Function
npx --yes knip           # find unused files, exports and dependencies
npx expo start           # scan the QR with Expo Go
```
Run test + typecheck + lint before calling anything done.

## Gotchas
- Supabase's redirect allow-list rejects `exp://<LAN IP>…` even against `exp://**`, so auth uses `makeRedirectUri({ preferLocalhost: true })`. Debug redirects by reading `auth.flow_state.referrer` with `npx supabase db query --linked`.
- Changing `.env.local` needs a dev-server restart.
