import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Text } from '@/design/components';
import { colors, space } from '@/design/tokens';

export interface LineChartProps {
  values: number[];
  height?: number;
  format: (v: number) => string;
  /** For pace: lower is better, so the axis is flipped to keep "up = better". */
  invert?: boolean;
}

/** Minimal line chart: area-less line, end dot, best/latest labels. */
export function LineChart({ values, height = 160, format, invert }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const pad = 8;

  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v: number) => {
    const t = (v - min) / span;
    return pad + (invert ? t : 1 - t) * (height - pad * 2);
  };
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  const best = invert ? min : max;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Svg width={width} height={height}>
            {[0.25, 0.5, 0.75].map((g) => (
              <Line key={g} x1={0} x2={width} y1={height * g} y2={height * g} stroke={colors.line} strokeWidth={1} />
            ))}
            <Path d={d} stroke={colors.accentInk} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={x(values.length - 1)} cy={y(last)} r={5} fill={colors.accentInk} />
            <Circle cx={x(values.length - 1)} cy={y(last)} r={9} fill={colors.accentInk} opacity={0.15} />
          </Svg>
        </Animated.View>
      ) : (
        <View style={{ height }} />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
        <Text variant="caption" color="inkMuted" tabular>
          Best {format(best)}
        </Text>
        <Text variant="caption" color="inkMuted" tabular>
          Latest {format(last)}
        </Text>
      </View>
    </View>
  );
}
