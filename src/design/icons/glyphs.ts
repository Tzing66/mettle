// Mettle exercise glyphs: one simple figure per movement pattern, drawn on a
// 48×48 grid with round 3px strokes. Plain data (no React) so the same shapes
// render in the app and in scripts/preview-glyphs.ts.

export type GlyphShape =
  | { t: 'path'; d: string }
  | { t: 'head'; x: number; y: number }
  | { t: 'plate'; x: number; y: number; h?: number };

export const GLYPHS = {
  // Lying on a bench, bar pressed up over the chest.
  press: [
    { t: 'head', x: 8, y: 28 },
    { t: 'path', d: 'M12 29H29L35 35V42' },
    { t: 'path', d: 'M19 29V15' },
    { t: 'path', d: 'M8 14H30' },
    { t: 'plate', x: 10, y: 14 },
    { t: 'plate', x: 28, y: 14 },
    { t: 'path', d: 'M8 34H31' },
  ],
  // Standing, bar locked out overhead.
  overhead: [
    { t: 'head', x: 24, y: 15 },
    { t: 'path', d: 'M24 19V31M24 31L20 42M24 31L28 42' },
    { t: 'path', d: 'M24 21L17 9M24 21L31 9' },
    { t: 'path', d: 'M8 8H40' },
    { t: 'plate', x: 10, y: 8 },
    { t: 'plate', x: 38, y: 8 },
  ],
  // Bar on the back, hips down.
  squat: [
    { t: 'head', x: 22, y: 9 },
    { t: 'path', d: 'M22 13L18 25L30 27L28 41' },
    { t: 'path', d: 'M21 15L27 17' },
    { t: 'path', d: 'M9 15H37' },
    { t: 'plate', x: 11, y: 15 },
    { t: 'plate', x: 35, y: 15 },
  ],
  // Hip hinge with the bar hanging.
  hinge: [
    { t: 'head', x: 14, y: 15 },
    { t: 'path', d: 'M18 17L31 24L31 33L30 42' },
    { t: 'path', d: 'M21 19L22 33' },
    { t: 'path', d: 'M8 34H40' },
    { t: 'plate', x: 10, y: 34 },
    { t: 'plate', x: 38, y: 34 },
  ],
  // Split stance, back knee down.
  lunge: [
    { t: 'head', x: 23, y: 8 },
    { t: 'path', d: 'M23 12V25M23 25L32 30V42M23 25L15 34L9 41' },
    { t: 'path', d: 'M23 15V24' },
  ],
  // Hanging from a bar, chin up.
  pullup: [
    { t: 'path', d: 'M7 6H41' },
    { t: 'path', d: 'M16 6L19 17M32 6L29 17' },
    { t: 'head', x: 24, y: 14 },
    { t: 'path', d: 'M24 18V31M24 31L21 41M24 31L27 41' },
  ],
  // Bent over, pulling a dumbbell up.
  row: [
    { t: 'head', x: 11, y: 14 },
    { t: 'path', d: 'M15 16L32 23L31 33L33 42' },
    { t: 'path', d: 'M20 18L21 27' },
    { t: 'path', d: 'M15 29H27' },
    { t: 'plate', x: 16, y: 29, h: 7 },
    { t: 'plate', x: 26, y: 29, h: 7 },
  ],
  // Elbow pinned, forearm curled.
  curl: [
    { t: 'head', x: 20, y: 8 },
    { t: 'path', d: 'M20 12V27M20 27L18 42M20 27L23 42' },
    { t: 'path', d: 'M20 15V23L29 17' },
    { t: 'path', d: 'M30 11V23' },
    { t: 'plate', x: 30, y: 12, h: 5 },
    { t: 'plate', x: 30, y: 22, h: 5 },
  ],
  // Weight lowered behind the head (triceps).
  extension: [
    { t: 'head', x: 22, y: 14 },
    { t: 'path', d: 'M22 18V31M22 31L19 42M22 31L25 42' },
    { t: 'path', d: 'M22 20L26 8L19 5' },
    { t: 'path', d: 'M15 5H23' },
    { t: 'plate', x: 16, y: 5, h: 5 },
    { t: 'plate', x: 22, y: 5, h: 5 },
  ],
  // Arms out to the sides.
  raise: [
    { t: 'head', x: 24, y: 9 },
    { t: 'path', d: 'M24 13V28M24 28L21 42M24 28L27 42' },
    { t: 'path', d: 'M24 16H10M24 16H38' },
    { t: 'plate', x: 9, y: 16, h: 6 },
    { t: 'plate', x: 39, y: 16, h: 6 },
  ],
  // Arms wide, hugging inward (chest fly).
  fly: [
    { t: 'head', x: 24, y: 9 },
    { t: 'path', d: 'M24 13V28M24 28L21 42M24 28L27 42' },
    { t: 'path', d: 'M24 16C17 16 12 19 11 25M24 16C31 16 36 19 37 25' },
  ],
  // Up on the toes.
  calf: [
    { t: 'head', x: 24, y: 7 },
    { t: 'path', d: 'M24 11V26M24 26L23 37L26 40M24 26L25 37L28 40' },
    { t: 'path', d: 'M24 14V23' },
    { t: 'path', d: 'M14 42H34' },
    { t: 'path', d: 'M36 30V22M33 25L36 22L39 25' },
  ],
  // Crunch: lying, shoulders curled up.
  core: [
    { t: 'head', x: 14, y: 26 },
    { t: 'path', d: 'M17 29L26 36L33 26L39 36' },
    { t: 'path', d: 'M8 40H40' },
  ],
  // Plank.
  hold: [
    { t: 'head', x: 9, y: 22 },
    { t: 'path', d: 'M13 25L40 33' },
    { t: 'path', d: 'M14 26V36H20' },
    { t: 'path', d: 'M6 38H42' },
  ],
  // Walking with weights at the sides.
  carry: [
    { t: 'head', x: 24, y: 7 },
    { t: 'path', d: 'M24 11V26M24 26L19 41M24 26L30 41' },
    { t: 'path', d: 'M24 14L17 26M24 14L31 26' },
    { t: 'path', d: 'M14 27H20M28 27H34' },
    { t: 'plate', x: 15, y: 27, h: 6 },
    { t: 'plate', x: 33, y: 27, h: 6 },
  ],
  // Mid-air, knees tucked.
  jump: [
    { t: 'head', x: 24, y: 8 },
    { t: 'path', d: 'M24 12V24M24 24L18 30L22 35M24 24L30 30L26 35' },
    { t: 'path', d: 'M24 15L16 9M24 15L32 9' },
    { t: 'path', d: 'M14 42H34' },
  ],
  run: [
    { t: 'head', x: 27, y: 8 },
    { t: 'path', d: 'M26 12L22 25M22 25L30 31L28 41M22 25L16 33L9 32' },
    { t: 'path', d: 'M25 15L32 19M25 15L17 19L15 13' },
  ],
  walk: [
    { t: 'head', x: 24, y: 8 },
    { t: 'path', d: 'M24 12V26M24 26L19 41M24 26L29 41' },
    { t: 'path', d: 'M24 15L19 25M24 15L29 24' },
  ],
  bike: [
    { t: 'path', d: 'M14 33m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0' },
    { t: 'path', d: 'M35 33m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0' },
    { t: 'path', d: 'M14 33L21 22H32L35 33M21 22L26 33H35' },
    { t: 'head', x: 26, y: 8 },
    { t: 'path', d: 'M25 12L21 22M24 14L32 21' },
  ],
  // Rowing machine: seated, legs extended, handle at the chest.
  rower: [
    { t: 'head', x: 15, y: 15 },
    { t: 'path', d: 'M15 19L18 31L30 30L38 34' },
    { t: 'path', d: 'M17 22L25 24' },
    { t: 'path', d: 'M6 38H42M10 38V34' },
  ],
  swim: [
    { t: 'head', x: 13, y: 19 },
    { t: 'path', d: 'M17 21L37 23M37 23L42 21' },
    { t: 'path', d: 'M20 21L28 13L35 12' },
    { t: 'path', d: 'M6 30C10 27 14 33 18 30C22 27 26 33 30 30C34 27 38 33 42 30' },
  ],
  // Generic conditioning: stairs with a step-up figure.
  cardio: [
    { t: 'path', d: 'M6 42H16V34H26V26H36V18H42' },
    { t: 'head', x: 21, y: 10 },
    { t: 'path', d: 'M21 14V23M21 23L18 32M21 23L26 26' },
    { t: 'path', d: 'M21 16L27 19M21 16L16 20' },
  ],
} satisfies Record<string, GlyphShape[]>;

export type GlyphName = keyof typeof GLYPHS;

export const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];

export function isGlyphName(name: string | null | undefined): name is GlyphName {
  return !!name && name in GLYPHS;
}
