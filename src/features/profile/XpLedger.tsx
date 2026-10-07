// XP ledger: one row per workout with its total; tap to see the breakdown.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { listExercises } from '@/db/repositories/exercises';
import { completedSetsForWorkouts } from '@/db/repositories/workouts';
import { listLedger } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { Card, Chip, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronRightIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { motion, space } from '@/design/tokens';
import { formatDay, formatNumber } from '@/features/format';
import { groupLedger } from '@/features/xpLedger';

function readLedger() {
  const groups = groupLedger(listLedger());
  const ids = groups.flatMap((g) => (g.workoutId ? [g.workoutId] : []));
  const names = new Map(listExercises().map((e) => [e.id, e.name]));
  const exercisesByWorkout = new Map<string, string[]>();
  for (const s of completedSetsForWorkouts(ids)) {
    const list = exercisesByWorkout.get(s.workoutId) ?? [];
    const name = names.get(s.exerciseId) ?? s.exerciseId;
    if (!list.includes(name)) list.push(name);
    exercisesByWorkout.set(s.workoutId, list);
  }
  return groups.map((g) => ({ ...g, exercises: g.workoutId ? (exercisesByWorkout.get(g.workoutId) ?? []) : [] }));
}

export function XpLedger() {
  const styles = useStyles();
  const { colors } = useTheme();
  const groups = useDbQuery(readLedger, ['xp_events', 'workout_sets']);
  const [open, setOpen] = useState<string | null>(null);

  if (groups.length === 0) {
    return (
      <Card>
        <Text color="inkMuted">Nothing yet. Finish a workout to start earning.</Text>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      {groups.map((g, i) => {
        const expanded = open === g.key;
        const title = g.exercises.length
          ? g.exercises.slice(0, 3).join(', ') + (g.exercises.length > 3 ? ` +${g.exercises.length - 3}` : '')
          : 'Bonus';
        return (
          <Animated.View key={g.key} layout={LinearTransition.duration(motion.duration.base)} style={i > 0 && styles.divider}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => {
                haptics.tick();
                setOpen(expanded ? null : g.key);
              }}
              style={styles.row}>
              <View style={styles.flex}>
                <Text variant="label" numberOfLines={1}>
                  {title}
                </Text>
                <Text variant="caption" color="inkMuted">
                  {formatDay(g.at)}
                </Text>
              </View>
              {g.pending > 0 ? <Chip label="Pending" tone="xp" textColor="xpInk" /> : null}
              <Text variant="label" tabular>
                +{formatNumber(g.total)}
              </Text>
            </Pressable>
            {expanded ? (
              <Animated.View entering={FadeIn.duration(motion.duration.base)} style={styles.detail}>
                {g.lines.map((l) => (
                  <View key={l.label} style={styles.line}>
                    <Text variant="caption" color="inkMuted">
                      {l.label}
                      {l.count > 1 && l.label !== 'Working sets' ? ` ×${l.count}` : ''}
                    </Text>
                    <Text variant="caption" tabular>
                      +{formatNumber(l.amount)}
                    </Text>
                  </View>
                ))}
                {g.workoutId ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push({ pathname: '/workout/[id]', params: { id: g.workoutId! } })}
                    style={styles.open}>
                    <Text variant="caption" color="accentInk">
                      Open workout
                    </Text>
                    <ChevronRightIcon color={colors.accentInk} size={14} />
                  </Pressable>
                ) : null}
              </Animated.View>
            ) : null}
          </Animated.View>
        );
      })}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  flex: { flex: 1, gap: space.xxs },
  detail: { paddingHorizontal: space.md, paddingBottom: space.md, gap: space.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  open: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, marginTop: space.xs, alignSelf: 'flex-start' },
}));
