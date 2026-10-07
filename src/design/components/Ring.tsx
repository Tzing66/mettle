import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { motion } from '../tokens';
import { makeStyles, useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingProps {
  /** 0–1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}

/** Circular progress (weekly goal). Content is centred inside. */
export function Ring({ progress, size = 72, stroke = 7, color: colorProp, children }: RingProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = colorProp ?? colors.accent;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = useSharedValue(0);

  useEffect(() => {
    p.set(withSpring(Math.min(1, Math.max(0, progress)), motion.spring.snappy));
  }, [p, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - p.get()) }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.sunken} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
