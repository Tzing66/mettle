import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getExercise, toExerciseInfo } from '@/db/repositories/exercises';
import { exerciseHistory, listRecords, toSetInput, type SetRow } from '@/db/repositories/workouts';
import { useDbQuery } from '@/db/useDbQuery';
import { Card, ExerciseGlyph, PressableScale, Text } from '@/design/components';
import { ChevronLeftIcon } from '@/design/icons/Icons';
import { categoryColors, colors, radii, space } from '@/design/tokens';
import { setMetrics, type RecordMetric } from '@/engine';
import { formatDay, formatMetric, formatSet } from '@/features/format';
import { LineChart } from '@/features/history/LineChart';
import { useProfile } from '@/features/profile/useProfile';

const PRIMARY: Record<string, RecordMetric> = {
  weight_reps: 'e1rm',
  reps: 'max_reps',
  time: 'max_duration',
  distance_time: 'best_pace',
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const unit = profile?.unitPref ?? 'kg';
  const data = useDbQuery(
    () => {
      const exercise = getExercise(id);
      if (!exercise) return null;
      return {
        exercise,
        history: exerciseHistory(id),
        records: listRecords().filter((r) => r.exerciseId === id),
      };
    },
    ['workout_sets', 'personal_records'],
    [id],
  );

  if (!data) return null;
  const { exercise, history, records } = data;
  const info = toExerciseInfo(exercise);
  const metric = PRIMARY[exercise.trackingType];
  const lowerIsBetter = metric === 'best_pace';

  // Best value of the primary metric per workout, oldest first.
  const sessions = new Map<string, { date: Date; value: number; sets: SetRow[] }>();
  for (const s of history) {
    const m = setMetrics(toSetInput(s), info).find((x) => x.metric === metric);
    const entry = sessions.get(s.workoutId) ?? { date: s.endedAt, value: lowerIsBetter ? Infinity : -Infinity, sets: [] };
    entry.sets.push(s);
    if (m) entry.value = lowerIsBetter ? Math.min(entry.value, m.value) : Math.max(entry.value, m.value);
    sessions.set(s.workoutId, entry);
  }
  const list = [...sessions.values()];
  const points = list.map((x) => x.value).filter(Number.isFinite);
  const tone = categoryColors[exercise.category];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={[styles.code, { backgroundColor: tone.tint }]}>
            <ExerciseGlyph icon={exercise.icon} short={exercise.shortName} color={tone.ink} size={40} />
          </View>
          <View style={styles.flex}>
            <Text variant="title">{exercise.name}</Text>
            <Text variant="caption" color="inkMuted">
              {exercise.primaryMuscles.join(', ') || exercise.category}
            </Text>
          </View>
        </View>

        <Card>
          <Text variant="overline" color="inkMuted" style={styles.cardTitle}>
            {metric === 'e1rm' ? 'Estimated 1RM' : metric === 'best_pace' ? 'Pace' : metric === 'max_reps' ? 'Best set (reps)' : 'Longest hold'}
          </Text>
          {points.length >= 2 ? (
            <LineChart values={points} format={(v) => formatMetric(metric, v, unit)} invert={lowerIsBetter} />
          ) : (
            <Text color="inkMuted">Log this twice to see a trend.</Text>
          )}
        </Card>

        {records.length > 0 && (
          <Card style={styles.records}>
            <Text variant="overline" color="inkMuted">
              Records
            </Text>
            {records.map((r) => (
              <View key={r.metric} style={styles.recordRow}>
                <Text color="inkMuted">{formatDay(r.achievedAt)}</Text>
                <Text variant="label" tabular>
                  {formatMetric(r.metric, r.value, unit)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.section}>
          <Text variant="overline" color="inkMuted">
            Sessions
          </Text>
          {[...list].reverse().slice(0, 20).map((sess, i) => (
            <Card key={i} style={styles.session}>
              <Text variant="label">{formatDay(sess.date)}</Text>
              <Text variant="caption" color="inkMuted" tabular>
                {sess.sets.map((s) => formatSet(s, exercise.trackingType, unit)).join('  ·  ')}
              </Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, paddingTop: space.xs },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  code: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: space.xxs },
  cardTitle: { marginBottom: space.md },
  records: { gap: space.sm },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between' },
  section: { gap: space.sm },
  session: { gap: space.xs, padding: space.md },
});
