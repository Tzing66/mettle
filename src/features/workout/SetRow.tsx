import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { Chip, PressableScale, Stepper, Text, XPFloat } from '@/design/components';
import { CheckIcon, TrashIcon } from '@/design/icons/Icons';
import { colors, motion, radii, space } from '@/design/tokens';
import { displayWeight, toStoredKg, type ExerciseCategory, type TrackingType, type UnitPref } from '@/engine';

import { formatSet } from '../format';

export interface SetRowProps {
  set: SetRowData;
  number: number;
  tracking: TrackingType;
  category: ExerciseCategory;
  activity?: string | null;
  unit: UnitPref;
  expanded: boolean;
  isPr: boolean;
  /** XP shown in the float when this set is completed; null for none. */
  xpOnComplete: number | null;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onChange: (patch: Partial<Pick<SetRowData, 'weightKg' | 'reps' | 'durationS' | 'distanceM' | 'isWarmup'>>) => void;
  onDelete: () => void;
}

export function SetRow(props: SetRowProps) {
  const { set, number, tracking, unit, expanded, isPr, xpOnComplete } = props;
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
    if (!done) {
      checkScale.set(withSequence(withSpring(0.85, motion.spring.press), withSpring(1, motion.spring.pop)));
      if (xpOnComplete) setFloats((f) => [...f, Date.now()]);
    }
    props.onToggleComplete();
  };

  return (
    <Animated.View layout={LinearTransition.springify().damping(26).stiffness(340)} style={[styles.wrap, rowStyle]}>
      <View style={styles.row}>
        <Pressable
          onPress={props.onToggleExpand}
          onLongPress={() => props.onChange({ isWarmup: !set.isWarmup })}
          accessibilityHint="Tap to edit. Long-press to toggle warm-up."
          style={styles.main}>
          <View style={[styles.index, set.isWarmup && styles.warmup]}>
            <Text variant="caption" color={set.isWarmup ? 'xpInk' : 'inkMuted'} tabular>
              {set.isWarmup ? 'W' : number}
            </Text>
          </View>
          <Text variant="label" tabular style={styles.summary} numberOfLines={1}>
            {formatSet(set, tracking, unit)}
          </Text>
          {isPr ? (
            <Animated.View entering={FadeIn.duration(motion.duration.base)} exiting={FadeOut}>
              <Chip label="PR" tone="pr" textColor="prInk" />
            </Animated.View>
          ) : null}
        </Pressable>

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
            <XPFloat
              key={id}
              amount={xpOnComplete ?? 0}
              tone={isPr ? 'pr' : 'xp'}
              onDone={() => setFloats((f) => f.filter((x) => x !== id))}
            />
          ))}
        </View>
      </View>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(motion.duration.base)} exiting={FadeOut.duration(motion.duration.fast)} style={styles.editor}>
          <SetFields {...props} />
          <View style={styles.editorActions}>
            <Chip
              label={set.isWarmup ? 'Warm-up' : 'Working set'}
              tone={set.isWarmup ? 'xp' : 'sunken'}
              textColor={set.isWarmup ? 'xpInk' : 'inkMuted'}
              onPress={() => props.onChange({ isWarmup: !set.isWarmup })}
            />
            <PressableScale accessibilityLabel="Delete set" onPress={props.onDelete} style={styles.delete}>
              <TrashIcon color={colors.inkMuted} size={18} />
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function SetFields({ set, tracking, category, activity, unit, onChange }: SetRowProps) {
  const weight = (
    <Field label={`Weight (${unit})`}>
      <Stepper
        value={displayWeight(set.weightKg ?? 0, unit)}
        onChange={(v) => onChange({ weightKg: toStoredKg(v, unit) })}
        step={unit === 'kg' ? 2.5 : 5}
        max={unit === 'kg' ? 500 : 1100}
      />
    </Field>
  );
  const reps = (
    <Field label="Reps">
      <Stepper value={set.reps ?? 0} onChange={(v) => onChange({ reps: v })} step={1} max={200} decimals={0} />
    </Field>
  );
  const isCardio = category === 'cardio';
  const duration = (
    <Field label={isCardio ? 'Time (min)' : 'Time (sec)'}>
      <Stepper
        value={isCardio ? Math.round((set.durationS ?? 0) / 60) : (set.durationS ?? 0)}
        onChange={(v) => onChange({ durationS: isCardio ? v * 60 : v })}
        step={isCardio ? 1 : 5}
        max={isCardio ? 600 : 3600}
        decimals={0}
      />
    </Field>
  );
  const swim = activity === 'swim';
  const distance = (
    <Field label={swim ? 'Distance (m)' : 'Distance (km)'}>
      <Stepper
        value={swim ? (set.distanceM ?? 0) : (set.distanceM ?? 0) / 1000}
        onChange={(v) => onChange({ distanceM: swim ? v : Math.round(v * 1000) })}
        step={swim ? 25 : 0.1}
        max={swim ? 10000 : 300}
        decimals={swim ? 0 : 2}
      />
    </Field>
  );

  switch (tracking) {
    case 'weight_reps':
      return <>{weight}{reps}</>;
    case 'reps':
      return reps;
    case 'time':
      return duration;
    case 'distance_time':
      return <>{distance}{duration}</>;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="inkMuted">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.sm,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingLeft: space.xs,
    paddingRight: space.xs,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
  },
  index: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmup: {
    backgroundColor: colors.xp,
  },
  summary: {
    flex: 1,
  },
  check: {
    width: 44,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editor: {
    paddingHorizontal: space.sm,
    paddingBottom: space.md,
    gap: space.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  delete: {
    padding: space.sm,
  },
});
