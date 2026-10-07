import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptics } from '../haptics';
import { fonts, motion, radii, space } from '../tokens';
import { Text } from './Text';
import { makeStyles } from '../theme';

export interface SegmentedTabsProps<K extends string> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

/** Pill segmented control with a sliding indicator. */
export function SegmentedTabs<K extends string>({ options, value, onChange }: SegmentedTabsProps<K>) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width / options.length;

  const indicator = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, motion.spring.snappy) }],
  }));

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - space.xs * 2)}>
      {width > 0 ? <Animated.View style={[styles.indicator, indicator]} /> : null}
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.key === value }}
          style={styles.segment}
          onPress={() => {
            if (o.key !== value) {
              haptics.tick();
              onChange(o.key);
            }
          }}>
          <Text variant="caption" color={o.key === value ? 'ink' : 'inkMuted'} style={styles.label}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.sunken,
    borderRadius: radii.md,
    padding: space.xs,
  },
  indicator: {
    position: 'absolute',
    top: space.xs,
    bottom: space.xs,
    left: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.semibold,
  },
}));
