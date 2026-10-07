import { Alert, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import type { ExerciseRow } from '@/db/repositories/exercises';
import type { SetRow as SetRowData } from '@/db/repositories/workouts';
import { Card, Chip, ExerciseGlyph, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { DotsIcon, TimerIcon } from '@/design/icons/Icons';
import { motion, radii, space } from '@/design/tokens';
import type { UnitPref } from '@/engine';

import { formatSet } from '../format';
import { SetRow, setColumns, type NumericField } from './SetRow';
import { makeStyles, useTheme } from '@/design/theme';

export interface ExerciseCardProps {
  exercise: ExerciseRow;
  sets: SetRowData[];
  lastTime: SetRowData[];
  unit: UnitPref;
  planning: boolean;
  prSetIds: Set<string>;
  xpForSet: (set: SetRowData) => number | null;
  bonusRoundXp: number | null;
  onComplete: (set: SetRowData) => void;
  onField: (setId: string, field: NumericField, value: number | null) => void;
  onToggleWarmup: (set: SetRowData) => void;
  onDeleteSet: (setId: string) => void;
  onSetCount: (count: number) => void;
  onRemove: () => void;
  onBonusRound: () => void;
}

export function ExerciseCard(props: ExerciseCardProps) {
  const styles = useStyles();
  const { colors, categoryColors } = useTheme();
  const { exercise, sets, lastTime, unit, planning } = props;
  const tone = categoryColors[exercise.category];
  const cols = setColumns(exercise.trackingType, exercise.category, exercise.activity, unit);
  const workingNumbers = numberWorkingSets(sets);

  return (
    <Animated.View entering={FadeInDown.duration(motion.duration.slow)} exiting={FadeOut.duration(motion.duration.fast)} layout={LinearTransition.duration(motion.duration.base)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.code, { backgroundColor: tone.tint }]}>
            <ExerciseGlyph icon={exercise.icon} short={exercise.shortName} color={tone.ink} size={30} />
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

        <View style={styles.columns}>
          <Text variant="overline" color="inkFaint" style={styles.colIndex}>
            Set
          </Text>
          <View style={styles.colFields}>
            {cols.map((c, i) => (
              <Text
                key={c.field}
                variant="overline"
                color="inkFaint"
                align="center"
                style={{ width: c.field === 'reps' ? 52 : 68, marginLeft: i > 0 && exercise.trackingType === 'weight_reps' ? space.lg : 0 }}>
                {c.label}
              </Text>
            ))}
          </View>
          {planning ? null : <View style={styles.colCheck} />}
        </View>

        <View style={styles.sets}>
          {sets.map((s) => (
            <SetRow
              key={s.id}
              set={s}
              number={workingNumbers.get(s.id) ?? 0}
              tracking={exercise.trackingType}
              category={exercise.category}
              activity={exercise.activity}
              unit={unit}
              planning={planning}
              isPr={props.prSetIds.has(s.id)}
              xpOnComplete={props.xpForSet(s)}
              onToggleComplete={() => props.onComplete(s)}
              onField={(field, value) => props.onField(s.id, field, value)}
              onToggleWarmup={() => props.onToggleWarmup(s)}
              onDelete={() => props.onDeleteSet(s.id)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <SetCounter count={sets.length} onChange={props.onSetCount} />
          {props.bonusRoundXp !== null ? (
            <Chip
              label={`+5 min · +${props.bonusRoundXp} XP`}
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

/** − 3 sets + */
function SetCounter({ count, onChange }: { count: number; onChange: (n: number) => void }) {
  const styles = useStyles();
  const change = (n: number) => {
    if (n < 1) return;
    haptics.tick();
    onChange(n);
  };
  return (
    <View style={styles.counter}>
      <PressableScale accessibilityLabel="Remove a set" onPress={() => change(count - 1)} disabled={count <= 1} style={styles.counterButton}>
        <Text variant="heading">−</Text>
      </PressableScale>
      <Text variant="label" tabular style={styles.counterLabel}>
        {count} {count === 1 ? 'set' : 'sets'}
      </Text>
      <PressableScale accessibilityLabel="Add a set" onPress={() => change(count + 1)} style={styles.counterButton}>
        <Text variant="heading">+</Text>
      </PressableScale>
    </View>
  );
}

function numberWorkingSets(sets: SetRowData[]): Map<string, number> {
  const out = new Map<string, number>();
  let n = 0;
  for (const s of sets) if (!s.isWarmup) out.set(s.id, ++n);
  return out;
}

const useStyles = makeStyles((colors) => ({
  card: { padding: space.md, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  code: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, gap: space.xxs },
  menu: { padding: space.sm },
  columns: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xs, marginTop: space.xs },
  colIndex: { width: 28, textAlign: 'center' },
  colFields: { flex: 1, flexDirection: 'row', gap: space.sm },
  colCheck: { width: 44 },
  sets: { gap: space.xxs },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  counter: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterLabel: { minWidth: 56, textAlign: 'center' },
}));
