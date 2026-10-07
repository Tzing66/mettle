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

import { fonts, rankColors, rankInk } from '../tokens';
import { Text } from './Text';

export interface RankBadgeProps {
  rank: RankLetter;
  size?: number;
}

/** Crisp rounded tile with the rank letter. S gets a slow sheen. */
export function RankBadge({ rank, size = 64 }: RankBadgeProps) {
  return (
    <View
      accessibilityLabel={`Rank ${rank}`}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.26,
          backgroundColor: rankColors[rank],
          borderColor: rankInk[rank] + '22',
        },
      ]}>
      {rank === 'S' ? <Sheen size={size} /> : null}
      <Text
        style={{
          fontFamily: fonts.extrabold,
          fontSize: size * 0.46,
          lineHeight: size * 0.56,
          letterSpacing: -size * 0.02,
          color: rankInk[rank],
        }}>
        {rank}
      </Text>
    </View>
  );
}

function Sheen({ size }: { size: number }) {
  const x = useSharedValue(-1);

  useEffect(() => {
    x.set(withRepeat(withDelay(2200, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })), -1, false));
  }, [x]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() * size * 1.4 }, { rotate: '18deg' }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.sheen, { width: size * 0.28, height: size * 2 }, animated]} />;
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  sheen: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
