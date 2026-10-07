import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, motion, radii, space } from '../tokens';
import { Text } from './Text';

export interface XPFloatProps {
  amount: number;
  /** Called when the float has finished so the parent can unmount it. */
  onDone?: () => void;
  tone?: 'xp' | 'pr';
}

/** "+5 XP" that pops, rises and fades. Absolutely positioned and touch-transparent. */
export function XPFloat({ amount, onDone, tone = 'xp' }: XPFloatProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Runs once on mount; the ref means a new onDone from a re-render can't restart the animation.
  useEffect(() => {
    const finish = () => onDoneRef.current?.();
    scale.set(withSequence(withSpring(1.1, motion.spring.bouncy), withSpring(1, motion.spring.gentle)));
    progress.set(
      withTiming(1, { duration: motion.duration.float, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finish);
      }),
    );
  }, [progress, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.get() < 0.6 ? 1 : 1 - (progress.get() - 0.6) / 0.4,
    transform: [{ translateY: -40 * progress.get() }, { scale: scale.get() }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors[tone] }, animated]}>
      <Text variant="label">+{amount} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radii.pill,
  },
});
