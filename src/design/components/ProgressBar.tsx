import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion, radii } from '../tokens';
import { makeStyles, useTheme } from '../theme';

export interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  /** Any colour (token value or rank colour). */
  fill?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ progress, fill: fillProp, height = 8, style }: ProgressBarProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(clamped);
  const fill = fillProp ?? colors.accent;

  useEffect(() => {
    width.set(withSpring(clamped, motion.spring.snappy));
  }, [clamped, width]);

  const animated = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: fill, borderRadius: height / 2 }, animated]} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  track: {
    width: '100%',
    backgroundColor: colors.sunken,
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  fill: {
    height: '100%',
  },
}));
