import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { listExercises } from '@/db/repositories/exercises';
import { completedSetsForWorkouts, listFinishedWorkouts } from '@/db/repositories/workouts';
import { xpByDay, xpByWorkout } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { Card, ExerciseGlyph, PressableScale, Screen, Text } from '@/design/components';
import { ChevronRightIcon } from '@/design/icons/Icons';
import { categoryColors, colors, heatScale, radii, space } from '@/design/tokens';
import { dayKey, weekStart } from '@/engine';
import { formatDay, formatDurationMs, formatNumber } from '@/features/format';

const WEEKS = 16;

function readHistory() {
  const workouts = listFinishedWorkouts(100);
  const sets = completedSetsForWorkouts(workouts.map((w) => w.id));
  const xp = xpByWorkout(workouts.map((w) => w.id));
  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const thisMonday = new Date(weekStart(Date.now()));
  const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - (WEEKS - 1) * 7);

  const counts = new Map<string, number>();
  for (const s of sets) counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
  const topExercises = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .flatMap(([id, n]) => {
      const exercise = exercises.get(id);
      return exercise ? [{ exercise, sets: n }] : [];
    });

  return {
    today: dayKey(Date.now()),
    heatStart: start.getTime(),
    heat: xpByDay(start),
    workouts: workouts.map((w) => {
      const ws = sets.filter((s) => s.workoutId === w.id);
      return {
        id: w.id,
        endedAt: w.endedAt!,
        durationMs: w.endedAt!.getTime() - w.startedAt.getTime(),
        sets: ws.filter((s) => !s.isWarmup).length,
        exercises: [...new Set(ws.map((s) => exercises.get(s.exerciseId)?.name ?? s.exerciseId))],
        xp: xp.get(w.id) ?? 0,
      };
    }),
    topExercises,
  };
}

export default function History() {
  const data = useDbQuery(readHistory, ['workouts', 'workout_sets', 'xp_events']);

  return (
    <Screen>
      <Text variant="title">History</Text>

      <Card>
        <Text variant="overline" color="inkMuted" style={styles.cardTitle}>
          Last {WEEKS} weeks
        </Text>
        <Heatmap start={data.heatStart} today={data.today} xpByDay={data.heat} />
      </Card>

      {data.topExercises.length > 0 && (
        <View style={styles.section}>
          <Text variant="overline" color="inkMuted">
            Progress by exercise
          </Text>
          <Card padded={false}>
            {data.topExercises.map(({ exercise, sets }, i) => {
              const tone = categoryColors[exercise.category];
              return (
                <PressableScale
                  key={exercise.id}
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
                  style={[styles.exerciseRow, i > 0 && styles.divider]}>
                  <View style={[styles.code, { backgroundColor: tone.tint }]}>
                    <ExerciseGlyph icon={exercise.icon} short={exercise.shortName} color={tone.ink} size={28} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="label">{exercise.name}</Text>
                    <Text variant="caption" color="inkMuted">
                      {sets} sets logged
                    </Text>
                  </View>
                  <ChevronRightIcon color={colors.inkFaint} size={18} />
                </PressableScale>
              );
            })}
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="overline" color="inkMuted">
          Workouts
        </Text>
        {data.workouts.length === 0 ? (
          <Card>
            <Text color="inkMuted">No workouts yet. Finish one and it lands here.</Text>
          </Card>
        ) : (
          data.workouts.map((w, i) => (
            <Animated.View key={w.id} entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(280)}>
              <Card style={styles.workout}>
                <View style={styles.workoutTop}>
                  <Text variant="heading">{formatDay(w.endedAt)}</Text>
                  <Text variant="label" color="xpInk" tabular>
                    +{formatNumber(w.xp)} XP
                  </Text>
                </View>
                <Text variant="caption" color="inkMuted">
                  {formatDurationMs(w.durationMs)} · {w.sets} sets
                </Text>
                <Text color="inkMuted" numberOfLines={2}>
                  {w.exercises.join(' · ')}
                </Text>
              </Card>
            </Animated.View>
          ))
        )}
      </View>
    </Screen>
  );
}

/** Grid of weeks (columns, Mon–Sun), shaded by XP earned that day. */
function Heatmap({ start, today, xpByDay }: { start: number; today: string; xpByDay: Map<string, number> }) {
  const shade = (xp: number) => heatScale[xp <= 0 ? 0 : xp < 60 ? 1 : xp < 120 ? 2 : xp < 400 ? 3 : 4];
  const base = new Date(start);

  return (
    <View style={styles.heat}>
      {Array.from({ length: WEEKS }, (_, w) => (
        <View key={w} style={styles.heatCol}>
          {Array.from({ length: 7 }, (_, d) => {
            const key = dayKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + w * 7 + d).getTime());
            const future = key > today;
            return (
              <View
                key={d}
                style={[
                  styles.heatCell,
                  { backgroundColor: future ? 'transparent' : shade(xpByDay.get(key) ?? 0) },
                  key === today && styles.heatToday,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { marginBottom: space.md },
  section: { gap: space.sm },
  flex: { flex: 1, gap: space.xxs },
  heat: { flexDirection: 'row', justifyContent: 'space-between' },
  heatCol: { gap: space.xs },
  heatCell: { width: 14, height: 14, borderRadius: radii.xs - 2 },
  heatToday: { borderWidth: 1.5, borderColor: colors.ink },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.line },
  code: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  workout: { gap: space.xs },
  workoutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
