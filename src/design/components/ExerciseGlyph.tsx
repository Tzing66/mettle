import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { GLYPHS, isGlyphName, type GlyphShape } from '../icons/glyphs';
import { Text } from './Text';

export interface ExerciseGlyphProps {
  /** Glyph name from the catalogue; anything else falls back to the short code. */
  icon: string | null | undefined;
  short: string;
  color: string;
  size: number;
}

/** Movement-pattern figure for an exercise, or its letter code when there's no glyph (custom exercises). */
export function ExerciseGlyph({ icon, short, color, size }: ExerciseGlyphProps) {
  if (!isGlyphName(icon)) {
    return (
      <Text variant={size >= 40 ? 'heading' : 'caption'} style={{ color }}>
        {short}
      </Text>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      {(GLYPHS[icon] as readonly GlyphShape[]).map((s, i) => {
        if (s.t === 'head') return <Circle key={i} cx={s.x} cy={s.y} r={3.6} fill={color} />;
        if (s.t === 'plate') {
          const h = s.h ?? 9;
          return <Rect key={i} x={s.x - 1.75} y={s.y - h / 2} width={3.5} height={h} rx={1.2} fill={color} />;
        }
        return <Path key={i} d={s.d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </Svg>
  );
}
