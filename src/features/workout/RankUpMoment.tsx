// The one full-screen celebration: rank-ups only, so it stays special.
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { Button, RankBadge, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { motion, rankColors, space } from '@/design/tokens';
import type { RankLetter } from '@/engine';
import { makeStyles, useTheme } from '@/design/theme';

const PIECES = 28;

export function RankUpMoment({ rank, onDone }: { rank: RankLetter; onDone: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    haptics.success();
  }, []);

  const palette = [rankColors[rank], colors.accent, colors.info, colors.xp, colors.pr];

  return (
    <Animated.View entering={FadeIn.duration(motion.duration.slow)} exiting={FadeOut.duration(motion.duration.base)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      {Array.from({ length: PIECES }, (_, i) => (
        <Confetti key={i} index={i} width={width} height={height} color={palette[i % palette.length]} />
      ))}
      <View style={styles.center}>
        <Text variant="overline" color="inkMuted">
          Rank up
        </Text>
        <Animated.View entering={ZoomIn.delay(150).springify().damping(12).stiffness(200)}>
          <RankBadge rank={rank} size={140} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(450)} style={styles.copy}>
          <Text variant="title" align="center">
            You reached {rank} rank
          </Text>
          <Text color="inkMuted" align="center">
            Consistency got you here. Keep showing up.
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeIn.delay(700)} style={styles.footer}>
        <Button label="Continue" size="lg" onPress={onDone} />
      </Animated.View>
    </Animated.View>
  );
}

function Confetti({ index, width, height, color }: { index: number; width: number; height: number; color: string }) {
  const styles = useStyles();
  // Deterministic pseudo-random spread per piece.
  const r = (n: number) => {
    const x = Math.sin(index * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  const y = useSharedValue(-40);
  const rot = useSharedValue(0);
  const x0 = r(1) * width;
  const drift = (r(2) - 0.5) * 120;

  useEffect(() => {
    const delay = r(3) * 400;
    const duration = 1600 + r(4) * 900;
    y.set(withDelay(delay, withTiming(height * (0.55 + r(5) * 0.4), { duration, easing: Easing.out(Easing.quad) })));
    rot.set(withDelay(delay, withSpring(360 * (r(6) > 0.5 ? 1 : -1) * (1 + r(7)), { damping: 30, stiffness: 20 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x0 + drift * (y.get() / height) }, { translateY: y.get() }, { rotate: `${rot.get()}deg` }],
    opacity: 1 - Math.max(0, y.get() / height - 0.6) * 2.5,
  }));

  const w = 6 + r(8) * 6;
  return <Animated.View pointerEvents="none" style={[styles.piece, { width: w, height: w * 1.6, backgroundColor: color }, style]} />;
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    backgroundColor: colors.bg,
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    padding: space.xl,
  },
  copy: { gap: space.sm },
  footer: { padding: space.lg, paddingBottom: space.xxxl },
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
}));
