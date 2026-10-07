import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { PressableScale, ProgressBar, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { TimerIcon } from '@/design/icons/Icons';
import { motion, radii, shadows, space } from '@/design/tokens';
import { formatDuration } from '@/engine';

import { useWorkoutUi } from './store';
import { makeStyles, useTheme } from '@/design/theme';

/** Floating rest countdown. Never blocks the list underneath. */
export function RestTimerBar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const rest = useWorkoutUi((s) => s.rest);
  const extend = useWorkoutUi((s) => s.extendRest);
  const stop = useWorkoutUi((s) => s.stopRest);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= rest.endsAt) {
        haptics.success();
        stop();
      }
    }, 250);
    return () => clearInterval(id);
  }, [rest, stop]);

  if (!rest) return null;
  const remaining = Math.max(0, (rest.endsAt - now) / 1000);

  return (
    <Animated.View entering={FadeInDown.duration(motion.duration.base)} exiting={FadeOutDown.duration(motion.duration.fast)} style={styles.bar}>
      <TimerIcon color={colors.onPrimary} size={18} />
      <View style={styles.middle}>
        <Text variant="label" color="onPrimary" tabular>
          Rest {formatDuration(remaining)}
        </Text>
        <ProgressBar progress={remaining / rest.durationS} fill={colors.accent} height={4} style={styles.progress} />
      </View>
      <PressableScale accessibilityLabel="Add 15 seconds" onPress={() => extend(15)} style={styles.action}>
        <Text variant="caption" color="onPrimary">
          +15s
        </Text>
      </PressableScale>
      <PressableScale accessibilityLabel="Skip rest" onPress={stop} style={styles.action}>
        <Text variant="caption" color="onPrimary">
          Skip
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    ...shadows.raised,
  },
  middle: {
    flex: 1,
    gap: space.xs,
  },
  progress: {
    backgroundColor: colors.onPrimaryTrack,
  },
  action: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
}));
