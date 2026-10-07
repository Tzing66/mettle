import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import type { ExerciseRow } from '@/db/repositories/exercises';
import type { SetRow as SetRowData } from '@/db/repositories/workouts';
import { Card, Chip, PressableScale, Text } from '@/design/components';
import { DotsIcon, PlusIcon, TimerIcon } from '@/design/icons/Icons';
import { categoryColors, colors, motion, radii, space } from '@/design/tokens';
import type { UnitPref } from '@/engine';

import { formatSet } from '../format';
import { SetRow, type SetRowProps } from './SetRow';

export interface ExerciseCardProps {
  exercise: ExerciseRow;
  sets: SetRowData[];
  lastTime: SetRowData[];
  unit: UnitPref;
  expandedSetId: string | null;
  prSetIds: Set<string>;
  xpForSet: (set: SetRowData) => number | null;
  bonusRoundXp: number | null;
  onExpand: (setId: string | null) => void;
  onComplete: (set: SetRowData) => void;
  onChangeSet: (setId: string, patch: Parameters<SetRowProps['onChange']>[0]) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onRemove: () => void;
  onBonusRound: () => void;
}

export function ExerciseCard(props: ExerciseCardProps) {
  const { exercise, sets, lastTime, unit } = props;
  const tone = categoryColors[exercise.category];
  let working = 0;

  return (
    <Animated.View entering={FadeInDown.duration(motion.duration.slow)} exiting={FadeOut.duration(motion.duration.fast)} layout={LinearTransition.duration(motion.duration.base)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.code, { backgroundColor: tone.tint }]}>
            <Text variant="caption" style={{ color: tone.ink }}>
              {exercise.shortName}
            </Text>
          </View>
          <View style={styles.titles}>
            <Text variant="heading" numberOfLines={1}>
              {exercise.name}
            </Text>
            <Text variant="caption" color="inkMuted" numberOfLines={1}>
              {lastTime.length
                ? `Last: ${lastTime.filter((s) => !s.isWarmup).map((s) => formatSet(s, exercise.trackingType, unit)).join(', ')}`
                : 'First time: set your baseline'}
            </Text>
          </View>
          <PressableScale
            accessibilityLabel={`${exercise.name} options`}
            onPress={() =>
              Alert.alert(exercise.name, undefined, [
                { text: 'Remove from workout', style: 'destructive', onPress: props.onRemove },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
            style={styles.menu}>
            <DotsIcon color={colors.inkMuted} />
          </PressableScale>
        </View>

        <View style={styles.sets}>
          {sets.map((s) => {
            if (!s.isWarmup) working++;
            return (
              <SetRow
                key={s.id}
                set={s}
                number={working}
                tracking={exercise.trackingType}
                category={exercise.category}
                activity={exercise.activity}
                unit={unit}
                expanded={props.expandedSetId === s.id}
                isPr={props.prSetIds.has(s.id)}
                xpOnComplete={props.xpForSet(s)}
                onToggleExpand={() => props.onExpand(props.expandedSetId === s.id ? null : s.id)}
                onToggleComplete={() => props.onComplete(s)}
                onChange={(patch) => props.onChangeSet(s.id, patch)}
                onDelete={() => props.onDeleteSet(s.id)}
              />
            );
          })}
        </View>

        <View style={styles.footer}>
          <PressableScale accessibilityRole="button" onPress={props.onAddSet} style={styles.addSet}>
            <PlusIcon color={colors.accentInk} size={18} />
            <Text variant="label" color="accentInk">
              Add set
            </Text>
          </PressableScale>
          {props.bonusRoundXp !== null ? (
            <Chip
              label={`Bonus round +5 min · +${props.bonusRoundXp} XP`}
              tone="xp"
              textColor="xpInk"
              icon={<TimerIcon color={colors.xpInk} size={14} />}
              onPress={props.onBonusRound}
            />
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    gap: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  code: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    gap: space.xxs,
  },
  menu: {
    padding: space.sm,
  },
  sets: {
    gap: space.xxs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
  },
});
