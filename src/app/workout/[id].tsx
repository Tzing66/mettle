// Workout detail: what you did, the PRs it set, and where every bit of XP came from.
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises } from '@/db/repositories/exercises';
import { getWorkout, groupByExercise, setsForWorkout } from '@/db/repositories/workouts';
import { eventsForWorkout } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Card, Chip, ExerciseGlyph, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon, TrophyIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space } from '@/design/tokens';
import { formatDay, formatDurationMs, formatNumber, formatSet } from '@/features/format';
import { useProfile } from '@/features/profile/useProfile';
import { deleteFinishedWorkout } from '@/features/workout/deleteWorkout';
import { xpBreakdown } from '@/features/xpBreakdown';

function readWorkout(id: string) {
  const workout = getWorkout(id);
  if (!workout || !workout.endedAt) return null;
  const sets = setsForWorkout(id).filter((s) => s.completedAt);
  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const events = eventsForWorkout(id);
  // Sets that were PRs at the time (a later, better set doesn't erase the badge).
  const prSetIds = new Set(events.filter((e) => e.reason === 'personal_record').map((e) => e.sourceId));
  return {
    workout,
    groups: groupByExercise(sets).flatMap((g) => {
      const exercise = exercises.get(g.exerciseId);
      return exercise ? [{ exercise, sets: g.sets }] : [];
    }),
    prSetIds,
    lines: xpBreakdown(events),
    total: events.reduce((s, e) => s + e.amount, 0),
    setCount: sets.filter((s) => !s.isWarmup).length,
  };
}

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors, categoryColors } = useTheme();
  const profile = useProfile();
  const unit = profile?.unitPref ?? 'kg';
  const data = useDbQuery(() => readWorkout(id), ['workouts', 'workout_sets', 'xp_events', 'personal_records'], [id]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete this workout?',
      'Its sets and the XP it earned will be removed, and your records and rank recalculated. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete workout',
          style: 'destructive',
          onPress: () => {
            haptics.tick();
            router.back();
            // After navigating away so this screen doesn't re-render a deleted workout.
            setTimeout(() => deleteFinishedWorkout(id), 0);
          },
        },
      ],
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
      </View>
      {!data ? (
        <View style={styles.missing}>
          <Text color="inkMuted">This workout no longer exists.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(260)} style={styles.titles}>
            <Text variant="title">{formatDay(data.workout.endedAt!)}</Text>
            <Text color="inkMuted">
              {formatDurationMs(data.workout.endedAt!.getTime() - data.workout.startedAt.getTime())} · {data.setCount} sets ·{' '}
              {data.groups.length} exercise{data.groups.length === 1 ? '' : 's'}
            </Text>
          </Animated.View>

          <Card style={styles.xpCard}>
            <View style={styles.xpTop}>
              <Text variant="overline" color="inkMuted">
                XP earned
              </Text>
              <Text variant="heading" color="xpInk" tabular>
                +{formatNumber(data.total)}
              </Text>
            </View>
            {data.lines.map((l) => (
              <View key={l.label} style={styles.line}>
                <Text color="inkMuted">
                  {l.label}
                  {l.count > 1 && (l.label === 'Firsts' || l.label === 'Personal records' || l.label === 'Benchmarks') ? ` ×${l.count}` : ''}
                </Text>
                <View style={styles.lineRight}>
                  {l.pending > 0 ? <Chip label="pending" tone="xp" textColor="xpInk" /> : null}
                  <Text variant="label" tabular>
                    +{formatNumber(l.amount)}
                  </Text>
                </View>
              </View>
            ))}
            {data.lines.length === 0 ? <Text color="inkMuted">No XP recorded for this workout.</Text> : null}
          </Card>

          {data.groups.map(({ exercise, sets }) => {
            const tone = categoryColors[exercise.category];
            return (
              <PressableScale key={exercise.id} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}>
                <Card style={styles.exercise}>
                  <View style={styles.exerciseTop}>
                    <View style={[styles.code, { backgroundColor: tone.tint }]}>
                      <ExerciseGlyph icon={exercise.icon} short={exercise.shortName} color={tone.ink} size={28} />
                    </View>
                    <Text variant="heading" style={styles.flex} numberOfLines={1}>
                      {exercise.name}
                    </Text>
                  </View>
                  {sets.map((s) => (
                    <View key={s.id} style={styles.setRow}>
                      <Text variant="caption" color="inkMuted" tabular style={styles.setIndex}>
                        {s.isWarmup ? 'W' : sets.filter((x) => !x.isWarmup && x.setIndex <= s.setIndex).length}
                      </Text>
                      <Text variant="label" tabular style={styles.flex}>
                        {formatSet(s, exercise.trackingType, unit)}
                      </Text>
                      {data.prSetIds.has(s.id) ? (
                        <Chip label="PR" tone="pr" textColor="prInk" icon={<TrophyIcon color={colors.prInk} size={12} />} />
                      ) : null}
                    </View>
                  ))}
                </Card>
              </PressableScale>
            );
          })}

          <Button label="Delete workout" variant="ghost" onPress={confirmDelete} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, paddingTop: space.xs },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  titles: { gap: space.xs, marginBottom: space.xs },
  xpCard: { gap: space.sm },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  exercise: { gap: space.sm, padding: space.md },
  exerciseTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  code: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.xs },
  setIndex: { width: 20, textAlign: 'center' },
}));
