import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { RankLetter } from '@/engine/config';

import { colors, radii, rankColors, type } from '../tokens';
import { Text } from './Text';

export interface RankBadgeProps {
  rank: RankLetter;
  size?: number;
}

/** Soft rounded tile with the rank letter. S gets a slow, gentle shimmer. */
export function RankBadge({ rank, size = 72 }: RankBadgeProps) {
  return (
    <View
      accessibilityLabel={`Rank ${rank}`}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: rankColors[rank] },
      ]}>
      {rank === 'S' ? <Shimmer size={size} /> : null}
      <Text style={[type.display, { fontSize: size * 0.5, lineHeight: size * 0.6, color: colors.ink }]}>{rank}</Text>
    </View>
  );
}

function Shimmer({ size }: { size: number }) {
  const x = useSharedValue(-1);

  useEffect(() => {
    x.set(withRepeat(
      withDelay(1400, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    ));
  }, [x]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() * size * 1.4 }, { rotate: '20deg' }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.sheen, { width: size * 0.35, height: size * 2 }, animated]} />;
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.lg,
  },
  sheen: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
