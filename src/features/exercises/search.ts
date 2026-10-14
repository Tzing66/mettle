// Exercise search that understands how people actually type: any word order,
// equipment words ("barbell squat"), gym shorthand ("db", "ohp", "rdl"), and
// other common names ("skull crusher", "butterfly"). Best matches first.
import catalogue from '@config/exercises.json';

interface Searchable {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
}

const aliasesById = new Map(
  (catalogue.exercises as { id: string; aliases?: string[] }[]).map((e) => [e.id, (e.aliases ?? []).map((a) => a.toLowerCase())]),
);

/** Shorthand → what it stands for. */
const SHORTHAND: Record<string, string> = {
  db: 'dumbbell',
  dbs: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  kbs: 'kettlebell',
  ez: 'e-z',
  bw: 'body only',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  sldl: 'stiff-leg deadlift',
  bss: 'bulgarian split squat',
  tri: 'triceps',
  tris: 'triceps',
  bi: 'biceps',
  bis: 'biceps',
  lats: 'lats',
  abs: 'abdominals',
  quads: 'quadriceps',
  hams: 'hamstrings',
  glutes: 'glutes',
};

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "pushups" and "push ups" and "push-up" all compare alike; trailing plurals don't matter. */
const stem = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

function words(s: string): string[] {
  return normalise(s)
    .split(' ')
    .filter(Boolean)
    .flatMap((w) => normalise(SHORTHAND[w] ?? w).split(' '))
    .map(stem);
}

const compact = (s: string) => words(s).join('');

/** Lower is better; null = no match. */
function score(e: Searchable, query: string, queryWords: string[]): number | null {
  // Compared without spaces, hyphens or plurals: "pushups" = "push-up" = "push ups".
  const name = compact(e.name);
  const q = compact(query);
  const aliases = (aliasesById.get(e.id) ?? []).map(compact);
  if (name === q) return 0;
  if (aliases.includes(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (name.includes(q) || aliases.some((a) => a.includes(q))) return 3;

  // Every query word must appear somewhere: name, other names, equipment or muscles.
  const nameWords = new Set(words(e.name));
  const aliasWords = new Set((aliasesById.get(e.id) ?? []).flatMap(words));
  const otherWords = new Set([...words(e.equipment ?? ''), ...e.primaryMuscles.flatMap(words)]);
  let inName = 0;
  for (const w of queryWords) {
    const hit = (set: Set<string>) => [...set].some((x) => x === w || (w.length >= 3 && x.startsWith(w)));
    if (hit(nameWords)) inName++;
    else if (!hit(aliasWords) && !hit(otherWords)) return null;
  }
  // More of the query in the name itself ranks higher.
  return 4 + (queryWords.length - inName);
}

export function searchExercises<T extends Searchable>(exercises: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return [];
  const queryWords = words(q);
  return exercises
    .map((e) => ({ e, s: score(e, q, queryWords) }))
    .filter((r): r is { e: T; s: number } => r.s !== null)
    .sort((a, b) => a.s - b.s || a.e.name.length - b.e.name.length || a.e.name.localeCompare(b.e.name))
    .map((r) => r.e);
}
