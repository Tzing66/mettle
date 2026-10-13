// One routine: its exercises and sets, and Start / Share / Rename / Delete.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises } from '@/db/repositories/exercises';
import { getRoutine } from '@/db/repositories/routines';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Card, ExerciseGlyph, PressableScale, Text } from '@/design/components';
import { ChevronLeftIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space } from '@/design/tokens';
import { formatSet } from '@/features/format';
import { useProfile } from '@/features/profile/useProfile';
import { confirmDeleteRoutine, shareRoutineWithCode, startRoutine } from '@/features/routines/actions';
import { loadStyleFor } from '@/features/workout/load';

function readRoutine(id: string) {
  const routine = getRoutine(id);
  if (!routine) return null;
  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  return {
    routine,
    items: routine.items.flatMap((item) => {
      const exercise = exercises.get(item.exerciseId);
      return exercise ? [{ exercise, item }] : [];
    }),
  };
}

export default function RoutineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors, categoryColors } = useTheme();
  const unit = useProfile()?.unitPref ?? 'kg';
  const data = useDbQuery(() => readRoutine(id), ['routines', 'exercises'], [id]);
  const [sharing, setSharing] = useState(false);

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <ChevronLeftIcon color={colors.ink} />
          </PressableScale>
        </View>
        <View style={styles.missing}>
          <Text color="inkMuted">This routine was deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { routine, items } = data;
  const workingSets = items.reduce((n, { item }) => n + item.sets.filter((s) => !s.isWarmup && !s.isDrop).length, 0);

  const share = async () => {
    setSharing(true);
    await shareRoutineWithCode(routine);
    setSharing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titles}>
          <Text variant="overline" color="accentInk">
            Routine
          </Text>
          <Text variant="title">{routine.name}</Text>
          <Text color="inkMuted">
            {items.length} exercise{items.length === 1 ? '' : 's'} · {workingSets} sets
          </Text>
        </View>

        <Button label="Start this routine" size="lg" onPress={() => startRoutine(routine.items)} silent />

        {items.map(({ exercise, item }, i) => {
          const tone = categoryColors[exercise.category];
          let n = 0;
          return (
            <Animated.View key={`${exercise.id}-${i}`} entering={FadeInDown.delay(i * 40).duration(240)}>
              <Card style={styles.exercise}>
                <View style={styles.exerciseTop}>
                  <View style={[styles.code, { backgroundColor: tone.tint }]}>
                    <ExerciseGlyph icon={exercise.icon} short={exercise.shortName} color={tone.ink} size={28} />
                  </View>
                  <Text variant="heading" style={styles.flex} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                </View>
                {item.sets.map((s, k) => (
                  <View key={k} style={styles.setRow}>
                    <Text variant="caption" color="inkMuted" tabular style={styles.setIndex}>
                      {s.isWarmup ? 'W' : s.isDrop ? '↓' : ++n}
                    </Text>
                    <Text variant="label" tabular style={styles.flex}>
                      {item.fillWeights && s.weightKg === null && exercise.trackingType === 'weight_reps'
                        ? `${s.reps ?? '–'} reps · your weight`
                        : formatSet(s, exercise.trackingType, unit, loadStyleFor(exercise).style)}
                    </Text>
                  </View>
                ))}
              </Card>
            </Animated.View>
          );
        })}

        <View style={styles.actions}>
          <Button label={sharing ? 'Sharing…' : 'Share with a code'} variant="secondary" onPress={share} disabled={sharing} />
          <Button label="Rename" variant="ghost" onPress={() => router.push({ pathname: '/routines/name', params: { id: routine.id } })} />
          <Button label="Delete routine" variant="ghost" onPress={() => confirmDeleteRoutine(routine, () => router.back())} />
        </View>
      </ScrollView>
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
  flex: { flex: 1 },
  exercise: { gap: space.sm },
  exerciseTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  code: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  setIndex: { width: 28, textAlign: 'center' },
  actions: { gap: space.xs, marginTop: space.sm },
}));
