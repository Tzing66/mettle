// What the weight field means, and letting people type it the way they think.
//
// Stored weight is always the standard form, which records, tiers and
// placement use: per dumbbell for dumbbell pairs, the total including the bar
// for barbells, the selected weight for machines, and the added weight for
// bodyweight moves. The input mode only changes what you type and see:
// "both" dumbbells (stored ÷ 2), or plates "per side" (bar + 2 × side).
import catalogue from '@config/exercises.json';

import type { UnitPref } from '@/engine';

export type LoadStyle = 'pair' | 'single' | 'bar' | 'plain' | 'added';

/** 'side:20' = plates per side on a 20 kg bar. */
export type LoadMode = 'each' | 'both' | 'total' | `side:${number}`;

interface CatalogueLoad {
  id: string;
  load?: LoadStyle;
  barKg?: number;
}

const builtins = new Map((catalogue.exercises as CatalogueLoad[]).map((e) => [e.id, e]));

export function loadStyleFor(exercise: { id: string; category: string }): { style: LoadStyle; barKg: number } {
  const e = builtins.get(exercise.id);
  if (e?.load) return { style: e.load, barKg: e.barKg ?? 20 };
  // Custom exercises: bodyweight moves take added weight; anything else is plain.
  return { style: exercise.category === 'bodyweight' ? 'added' : 'plain', barKg: 20 };
}

/** The ways this exercise's weight can be typed, default first. */
export function modesFor(style: LoadStyle, barKg: number): { mode: LoadMode; title: string }[] {
  switch (style) {
    case 'pair':
      return [
        { mode: 'each', title: 'Each dumbbell' },
        { mode: 'both', title: 'Both together' },
      ];
    case 'bar':
      return [
        { mode: 'total', title: 'Total (bar included)' },
        { mode: `side:${barKg}`, title: `Plates per side (+${barKg} kg bar)` },
        ...(barKg === 20 ? [{ mode: 'side:15' as const, title: 'Plates per side (+15 kg bar)' }] : []),
      ];
    default:
      return [];
  }
}

/** Stored kg → the kg value shown in this mode. */
export function toModeKg(storedKg: number, mode: LoadMode): number {
  if (mode === 'both') return storedKg * 2;
  if (mode.startsWith('side:')) return Math.max(0, (storedKg - Number(mode.slice(5))) / 2);
  return storedKg;
}

/** Typed kg in this mode → stored kg. */
export function fromModeKg(typedKg: number, mode: LoadMode): number {
  if (mode === 'both') return typedKg / 2;
  if (mode.startsWith('side:')) return Number(mode.slice(5)) + typedKg * 2;
  return typedKg;
}

/** Column label for the weight field, e.g. "kg each", "kg/side", "+kg". */
export function weightLabel(style: LoadStyle, mode: LoadMode, unit: UnitPref): string {
  if (style === 'added') return `+${unit}`;
  if (mode === 'both') return `${unit} both`;
  if (mode.startsWith('side:')) return `${unit}/side`;
  if (style === 'pair') return `${unit} each`;
  if (style === 'bar') return `${unit} total`;
  return unit;
}

/** The mode in effect for an exercise: the remembered choice if still valid, else the default. */
export function modeFor(exercise: { id: string; category: string }, remembered: LoadMode | undefined): LoadMode {
  const { style, barKg } = loadStyleFor(exercise);
  const options = modesFor(style, barKg);
  if (remembered && options.some((o) => o.mode === remembered)) return remembered;
  return options[0]?.mode ?? 'total';
}
