// Storage is always kg / m / s. These helpers convert for display only.

export type UnitPref = 'kg' | 'lb';

export const LB_PER_KG = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

/** Converts a stored kg value to the user's display unit, rounded to 0.1. */
export function displayWeight(kg: number, unit: UnitPref): number {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  return Math.round(value * 10) / 10;
}

/** Converts a value typed in the user's unit back to kg for storage. */
export function toStoredKg(value: number, unit: UnitPref): number {
  return unit === 'lb' ? lbToKg(value) : value;
}

/** Formats seconds as m:ss or h:mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
