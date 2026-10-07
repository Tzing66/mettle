// Mettle's own tab icons: thin rounded strokes.
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: ColorValue;
  size?: number;
}

const stroke = { strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

export function HomeIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 11.5 12 5l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" stroke={color} {...stroke} />
      <Path d="M9.5 20.5v-5h5v5" stroke={color} {...stroke} />
    </Svg>
  );
}

export function HistoryIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={5.5} width={16} height={15} rx={3} stroke={color} {...stroke} />
      <Path d="M8 3.5v4M16 3.5v4M4 10.5h16" stroke={color} {...stroke} />
      <Circle cx={9} cy={15} r={1.2} fill={color} />
      <Circle cx={15} cy={15} r={1.2} fill={color} />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={9} r={4} stroke={color} {...stroke} />
      <Path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" stroke={color} {...stroke} />
    </Svg>
  );
}
