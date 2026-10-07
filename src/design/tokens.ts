// Design tokens: the single place to change how Mettle looks.
// Components must read colours, spacing, radii, type and motion from here — no hard-coded values.
// Direction: "Sage & stone": calm, grown-up. Pastels only as accents on a neutral base.
// Colours live in light/dark themes: read them with useTheme() / makeStyles() from ./theme.

import type { RankLetter } from '@/engine/config';
import type { ExerciseCategory } from '@/engine/types';

const palette = {
  stone: '#F6F6F3',
  white: '#FFFFFF',
  ink: '#16181D',
  slate: '#6B6F76',
  sage: '#8FB8A0',
  sageDeep: '#2F6B4F',
  mist: '#A9C7E3',
  sand: '#EBD9B4',
  clay: '#F2B8A2',
} as const;

const lightColors = {
  bg: palette.stone,
  surface: palette.white,
  /** Recessed areas: stepper buttons, inactive chips, tracks. */
  sunken: '#EEEEEA',
  ink: palette.ink,
  inkMuted: palette.slate,
  inkFaint: '#A3A6AB',
  line: '#E4E4DF',

  primary: palette.ink,
  onPrimary: palette.white,
  accent: palette.sage,
  /** Text and icons placed on `accent` (sage). Dark in both themes. */
  onAccent: palette.ink,
  accentInk: palette.sageDeep,
  accentSoft: '#E3EEE7',

  success: palette.sage,
  successSoft: '#E3EEE7',
  xp: palette.sand,
  xpInk: '#7A5B1E',
  pr: palette.clay,
  prInk: '#7E3920',
  info: palette.mist,

  overlay: 'rgba(22, 24, 29, 0.4)',
  /** Track behind progress on a `primary` background. */
  onPrimaryTrack: 'rgba(255, 255, 255, 0.15)',
};

export type ColorToken = keyof typeof lightColors;
export type Colors = Record<ColorToken, string>;

/** "Sage & stone" after dark: green-black surfaces, light ink, the same sage accent, deeper pastel tints. */
const darkColors: Colors = {
  bg: '#111412',
  surface: '#1A1E1B',
  sunken: '#232825',
  ink: '#ECEEEA',
  inkMuted: '#9CA29D',
  inkFaint: '#646A65',
  line: '#2A2F2B',

  primary: '#ECEEEA',
  onPrimary: '#111412',
  accent: palette.sage,
  onAccent: '#111412',
  accentInk: '#A8D4BA',
  accentSoft: '#1E2E25',

  success: palette.sage,
  successSoft: '#1E2E25',
  xp: '#3B3324',
  xpInk: '#E8D2A2',
  pr: '#3E2A23',
  prInk: '#F4BFA9',
  info: palette.mist,

  overlay: 'rgba(0, 0, 0, 0.6)',
  onPrimaryTrack: 'rgba(17, 20, 18, 0.18)',
};

/** Rank tiles stay pastel in both themes; their ink is always dark. */
export const rankColors: Record<RankLetter, string> = {
  E: '#D9DAD5',
  D: '#BFD8C8',
  C: '#BCD3E8',
  B: '#EBD9B4',
  A: '#F2C4B0',
  S: '#E9D8A6',
};

/** Darker partner for each rank colour, for letters and thin outlines. */
export const rankInk: Record<RankLetter, string> = {
  E: '#54574F',
  D: '#275C43',
  C: '#2F5878',
  B: '#7A5B1E',
  A: '#7E3920',
  S: '#6E5413',
};

type CategoryColors = Record<ExerciseCategory, { tint: string; ink: string }>;

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Colors;
  categoryColors: CategoryColors;
  /** History heatmap, from no activity to a big day. */
  heatScale: readonly [string, string, string, string, string];
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  categoryColors: {
    free_weight: { tint: '#E3EEE7', ink: '#2F6B4F' },
    machine: { tint: '#E2ECF5', ink: '#2F5878' },
    bodyweight: { tint: '#F3EBDA', ink: '#7A5B1E' },
    cardio: { tint: '#F8E6DE', ink: '#9A4A2E' },
  },
  heatScale: ['#EEEEEA', '#D5E6DB', '#B3D2BF', '#8FB8A0', '#2F6B4F'],
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  categoryColors: {
    free_weight: { tint: '#1E2E25', ink: '#A8D4BA' },
    machine: { tint: '#1D2832', ink: '#B4D0EA' },
    bodyweight: { tint: '#2E2A1F', ink: '#E8D2A2' },
    cardio: { tint: '#33251F', ink: '#F4BFA9' },
  },
  heatScale: ['#232825', '#1F3A2B', '#2D5A41', '#5E9677', '#8FB8A0'],
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
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: -0.1 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  /** Small uppercase section headers. */
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  /** Big weights and reps. */
  number: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
} as const;

export type TypeVariant = keyof typeof type;

export const shadows = {
  /** Cards are flat with a hairline; this is only for floating things. */
  card: {},
  raised: {
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Animations are short, spring-based and never block input. */
export const motion = {
  duration: { fast: 120, base: 180, slow: 260, float: 650 },
  spring: {
    /** Press feedback: very stiff, settles almost instantly. */
    press: { damping: 22, stiffness: 600, mass: 0.5 },
    /** Layout/progress: quick with no visible wobble. */
    snappy: { damping: 26, stiffness: 340, mass: 0.7 },
    /** Celebrations: one small overshoot. */
    pop: { damping: 14, stiffness: 320, mass: 0.6 },
  },
  pressScale: 0.97,
} as const;

/** Touch target minimum (Android 48dp / iOS 44pt). */
export const hitSize = 48;
