import { useEffect, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { SetRow as SetRowData } from '@/db/repositories/workouts';
import { Chip, NumberField, PressableScale, Text, XPFloat } from '@/design/components';
import { haptics } from '@/design/haptics';
import { CheckIcon } from '@/design/icons/Icons';
import { colors, motion, radii, space } from '@/design/tokens';
import { displayWeight, toStoredKg, type ExerciseCategory, type TrackingType, type UnitPref } from '@/engine';

export type NumericField = 'weightKg' | 'reps' | 'durationS' | 'distanceM';

export interface SetRowProps {
  set: SetRowData;
  number: number;
  tracking: TrackingType;
  category: ExerciseCategory;
  activity?: string | null;
  unit: UnitPref;
  /** Planning: values are targets, no completion yet. */
  planning: boolean;
  isPr: boolean;
  /** XP shown in the float when this set is completed; null for none. */
  xpOnComplete: number | null;
  onToggleComplete: () => void;
  onField: (field: NumericField, value: number | null) => void;
  onToggleWarmup: () => void;
  onDelete: () => void;
}

/** Column layout per tracking type, shared with the card's header labels. */
export function setColumns(tracking: TrackingType, category: ExerciseCategory, activity: string | null | undefined, unit: UnitPref) {
  const swim = activity === 'swim';
  const cardio = category === 'cardio';
  switch (tracking) {
    case 'weight_reps':
      return [{ field: 'weightKg', label: unit }, { field: 'reps', label: 'reps' }] as const;
    case 'reps':
      return [{ field: 'reps', label: 'reps' }] as const;
    case 'time':
      return [{ field: 'durationS', label: cardio ? 'min' : 'sec' }] as const;
    case 'distance_time':
      return [{ field: 'distanceM', label: swim ? 'm' : 'km' }, { field: 'durationS', label: 'min' }] as const;
  }
}

export function SetRow(props: SetRowProps) {
  const { set, number, tracking, category, activity, unit, planning, isPr, xpOnComplete } = props;
  const done = set.completedAt !== null;
  const [floats, setFloats] = useState<number[]>([]);

  const doneProgress = useSharedValue(done ? 1 : 0);
  const checkScale = useSharedValue(1);
  useEffect(() => {
    doneProgress.set(withTiming(done ? 1 : 0, { duration: motion.duration.base }));
  }, [done, doneProgress]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(doneProgress.get(), [0, 1], [colors.surface, colors.successSoft]),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(doneProgress.get(), [0, 1], [colors.sunken, colors.accent]),
    transform: [{ scale: checkScale.get() }],
  }));

  const toggleComplete = () => {
    // Blur any field being typed in so its value commits with the set.
    Keyboard.dismiss();
    if (!done) {
      checkScale.set(withSequence(withSpring(0.85, motion.spring.press), withSpring(1, motion.spring.pop)));
      if (xpOnComplete) setFloats((f) => [...f, Date.now()]);
    }
    props.onToggleComplete();
  };

  const openMenu = () => {
    haptics.tick();
    Alert.alert(`Set ${set.isWarmup ? '(warm-up)' : number}`, undefined, [
      { text: set.isWarmup ? 'Make working set' : 'Mark as warm-up', onPress: props.onToggleWarmup },
      { text: 'Delete set', style: 'destructive', onPress: props.onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const cols = setColumns(tracking, category, activity, unit);
  const swim = activity === 'swim';

  const toDisplay = (field: NumericField): number | null => {
    const v = set[field];
    if (v === null) return null;
    switch (field) {
      case 'weightKg':
        return displayWeight(v, unit);
      case 'distanceM':
        return swim ? v : v / 1000;
      case 'durationS':
        return category === 'cardio' ? Math.round(v / 60) : v;
      default:
        return v;
    }
  };
  const fromDisplay = (field: NumericField, v: number | null): number | null => {
    if (v === null) return null;
    switch (field) {
      case 'weightKg':
        return toStoredKg(v, unit);
      case 'distanceM':
        return swim ? Math.round(v) : Math.round(v * 1000);
      case 'durationS':
        return category === 'cardio' ? Math.round(v * 60) : Math.round(v);
      case 'reps':
        return Math.round(v);
    }
  };
  const decimals = (field: NumericField) => (field === 'weightKg' ? 1 : field === 'distanceM' && !swim ? 2 : 0);

  return (
    <Animated.View layout={LinearTransition.duration(motion.duration.base)} style={[styles.row, rowStyle]}>
      <Pressable onPress={openMenu} accessibilityLabel={`Set ${number} options`} hitSlop={6} style={[styles.index, set.isWarmup && styles.warmup]}>
        <Text variant="caption" color={set.isWarmup ? 'xpInk' : 'inkMuted'} tabular>
          {set.isWarmup ? 'W' : number}
        </Text>
      </Pressable>

      <View style={styles.fields}>
        {cols.map((c, i) => (
          <View key={c.field} style={styles.fieldWrap}>
            {i > 0 && tracking === 'weight_reps' ? (
              <Text variant="caption" color="inkFaint" style={styles.times}>
                ×
              </Text>
            ) : null}
            <NumberField
              value={toDisplay(c.field)}
              decimals={decimals(c.field)}
              width={c.field === 'reps' ? 52 : 68}
              accessibilityLabel={`Set ${number} ${c.label}`}
              editable={!done}
              onCommit={(v) => props.onField(c.field, fromDisplay(c.field, v))}
            />
          </View>
        ))}
        {isPr ? (
          <Animated.View entering={FadeIn.duration(motion.duration.base)} exiting={FadeOut}>
            <Chip label="PR" tone="pr" textColor="prInk" />
          </Animated.View>
        ) : null}
      </View>

      {planning ? null : (
        <View>
          <PressableScale
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={`Set ${number} complete`}
            onPress={toggleComplete}
            scaleTo={1}>
            <Animated.View style={[styles.check, checkStyle]}>
              <CheckIcon color={done ? colors.ink : colors.inkFaint} size={18} />
            </Animated.View>
          </PressableScale>
          {floats.map((id) => (
            <XPFloat key={id} amount={xpOnComplete ?? 0} tone={isPr ? 'pr' : 'xp'} onDone={() => setFloats((f) => f.filter((x) => x !== id))} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radii.sm,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmup: { backgroundColor: colors.xp },
  fields: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  times: { marginHorizontal: -space.xxs },
  check: {
    width: 44,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
