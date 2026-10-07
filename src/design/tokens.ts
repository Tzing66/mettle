// Design tokens: the single place to change how Mettle looks.
// Components must read colours, spacing, radii, type and motion from here — no hard-coded values.

import type { RankLetter } from '@/engine/config';
import type { ExerciseCategory } from '@/engine/types';

export const palette = {
  bg: '#FBF8F4',
  surface: '#FFFFFF',
  ink: '#2E2A3B',
  inkMuted: '#7A7489',
  lavender: '#C9B8F5',
  mint: '#B5EAD7',
  peach: '#FFD3B6',
  sky: '#B8DEF5',
  pink: '#FFB7C5',
  butter: '#FFF1A8',
} as const;

export const colors = {
  ...palette,
  primary: palette.lavender,
  onPrimary: palette.ink,
  success: palette.mint,
  pr: palette.pink,
  xp: palette.butter,
  /** Hairlines, dividers, inactive tracks. */
  line: '#ECE6F2',
  track: '#F1ECF7',
  /** Darker lavender for text/icons that must read on light backgrounds. */
  primaryInk: '#6B55B8',
  overlay: 'rgba(46, 42, 59, 0.35)',
} as const;

export type ColorToken = keyof typeof colors;

export const rankColors: Record<RankLetter, string> = {
  E: '#D9D6E3',
  D: '#B5EAD7',
  C: '#B8DEF5',
  B: '#FFD3B6',
  A: '#FFB7C5',
  S: '#FFE27A',
};

export const categoryColors: Record<ExerciseCategory, string> = {
  free_weight: palette.lavender,
  machine: palette.sky,
  bodyweight: palette.mint,
  cardio: palette.peach,
};

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const type = {
  display: { fontFamily: fonts.black, fontSize: 40, lineHeight: 46 },
  title: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  /** Big weights and reps. */
  number: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32 },
} as const;

export type TypeVariant = keyof typeof type;

export const shadows = {
  card: {
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: palette.ink,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

/** Animations are short, spring-based and never block input. */
export const motion = {
  duration: { fast: 150, base: 220, slow: 300, float: 700 },
  spring: {
    press: { damping: 18, stiffness: 320, mass: 0.6 },
    gentle: { damping: 20, stiffness: 180, mass: 1 },
    bouncy: { damping: 12, stiffness: 220, mass: 0.8 },
  },
  pressScale: 0.96,
} as const;

/** Touch target minimum (Android 48dp / iOS 44pt). */
export const hitSize = 48;
