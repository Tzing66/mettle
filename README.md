# Mettle

A gamified workout tracker: show up to earn XP, hit real strength and running benchmarks to earn a lot of it, and climb from **E rank to S rank**. Logging is fast and works offline; sign in to back up your training and race friends on weekly leaderboards.

## Run it

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and publishable key
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). Without `.env.local` the app still works, just without accounts and sync.

## Develop

```bash
npm test               # engine, SQLite integration, sync and server tests
npm run typecheck
npx expo lint
npm run db:generate    # after changing src/db/schema.ts
npx supabase db push   # apply cloud migrations (supabase/migrations)
npm run deploy:edge    # rebuild + deploy the server XP function
```

- Tuning lives in `config/` (XP values, rank thresholds, benchmark tiers); the look lives in `src/design/tokens.ts`.
- XP is derived from logged sets by a pure engine (`src/engine`). The same code runs on the server so leaderboard XP can't be edited on the phone.

## Data sources

- Exercises: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain) plus Mettle's own entries.
- Strength and rep standards: [Strength Level](https://strengthlevel.com/strength-standards).
- Running age grading: WMA/USATF 2025 road standards via [Age-Grade-Tables](https://github.com/AlanLyttonJones/Age-Grade-Tables) (CC0).
