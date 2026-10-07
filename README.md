# Mettle

A gamified workout tracker: show up to earn XP, hit real benchmarks to earn a lot of XP, and climb from **E rank to S rank**. Logging stays fast, and the look is soft pastels.

See [plan.md](plan.md) for the full product plan and roadmap.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

## Develop

```bash
npm test             # XP engine unit tests
npm run typecheck
npx expo lint
npm run db:generate  # after changing src/db/schema.ts
```

Tuning lives in `config/` (XP values, rank thresholds, benchmark tiers) and the look lives in `src/design/tokens.ts`.
