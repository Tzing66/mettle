// Mettle UI icons: 24px grid, 1.8 stroke, rounded caps.
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface IconProps {
  color: ColorValue;
  size?: number;
  strokeWidth?: number;
}

function Icon({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}

const s = (color: ColorValue, strokeWidth = 1.8) =>
  ({ stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }) as const;

export const PlusIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}><Path d="M12 5v14M5 12h14" {...s(color, strokeWidth)} /></Icon>
);
export const CheckIcon = ({ color, size, strokeWidth = 2.4 }: IconProps) => (
  <Icon size={size}><Path d="m5 12.5 4.5 4.5L19 7.5" {...s(color, strokeWidth)} /></Icon>
);
export const CloseIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}><Path d="M6 6l12 12M18 6 6 18" {...s(color, strokeWidth)} /></Icon>
);
export const ChevronRightIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}><Path d="m9 5 7 7-7 7" {...s(color, strokeWidth)} /></Icon>
);
export const ChevronLeftIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}><Path d="m15 5-7 7 7 7" {...s(color, strokeWidth)} /></Icon>
);
export const SearchIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}>
    <Circle cx={11} cy={11} r={6.5} {...s(color, strokeWidth)} />
    <Path d="m16 16 4 4" {...s(color, strokeWidth)} />
  </Icon>
);
export const StarIcon = ({ color, size, filled }: IconProps & { filled?: boolean }) => (
  <Icon size={size}>
    <Path
      d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"
      {...s(color, 1.6)}
      fill={filled ? color : 'none'}
    />
  </Icon>
);
export const TrashIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}><Path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" {...s(color, strokeWidth)} /></Icon>
);
export const TimerIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}>
    <Circle cx={12} cy={13} r={7} {...s(color, strokeWidth)} />
    <Path d="M12 9.5V13l2.5 1.5M10 3h4" {...s(color, strokeWidth)} />
  </Icon>
);
export const FlameIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}>
    <Path d="M12 3c.5 3 4.5 5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5.3 1.5 1 2.3 2 2.5C11 8.5 11 6 12 3z" {...s(color, strokeWidth)} />
  </Icon>
);
export const TrophyIcon = ({ color, size, strokeWidth }: IconProps) => (
  <Icon size={size}>
    <Path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" {...s(color, strokeWidth)} />
  </Icon>
);
export const DotsIcon = ({ color, size }: IconProps) => (
  <Icon size={size}>
    <Circle cx={6} cy={12} r={1.5} fill={color as string} />
    <Circle cx={12} cy={12} r={1.5} fill={color as string} />
    <Circle cx={18} cy={12} r={1.5} fill={color as string} />
  </Icon>
);
