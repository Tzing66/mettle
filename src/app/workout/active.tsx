import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises, toExerciseInfo, type ExerciseRow } from '@/db/repositories/exercises';
import {
  addSet,
  deleteSet,
  discardWorkout,
  getActiveWorkout,
  groupByExercise,
  lastSessionSets,
  listRecords,
  removeExerciseFromWorkout,
  setCompleted,
  setsForWorkout,
  toSetInput,
  updateSet,
  type SetRow,
} from '@/db/repositories/workouts';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon, PlusIcon } from '@/design/icons/Icons';
import { colors, radii, space } from '@/design/tokens';
import { cardioXp, formatDuration, setBeatsRecords, xpRules } from '@/engine';
import { useProfile } from '@/features/profile/useProfile';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { finishWorkout } from '@/features/workout/finishWorkout';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { useWorkoutUi } from '@/features/workout/store';

export default function ActiveWorkout() {
  const profile = useProfile();
  const workout = useDbQuery(getActiveWorkout, ['workouts']);
  const sets = useDbQuery(() => (workout ? setsForWorkout(workout.id) : []), ['workout_sets'], [workout?.id]);
  const exercises = useDbQuery(listExercises, ['exercises']);
  const records = useDbQuery(listRecords, ['personal_records']);
  const { expandedSetId, setExpanded, startRest, stopRest, setLastSummary } = useWorkoutUi();

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const groups = groupByExercise(sets);
  const unit = profile?.unitPref ?? 'kg';
  const engineRecords = records.map((r) => ({ ...r, achievedAt: r.achievedAt.getTime() }));

  const isPrSet = (s: SetRow, ex: ExerciseRow) => setBeatsRecords(toSetInput(s), toExerciseInfo(ex), engineRecords).length > 0;
  const prSetIds = new Set(sets.filter((s) => byId.has(s.exerciseId) && isPrSet(s, byId.get(s.exerciseId)!)).map((s) => s.id));

  const completedWorking = sets.filter((s) => s.completedAt && !s.isWarmup && byId.get(s.exerciseId)?.category !== 'cardio').length;
  const cardioMinutesDone = Math.floor(
    sets.filter((s) => s.completedAt && !s.isWarmup && byId.get(s.exerciseId)?.category === 'cardio').reduce((m, s) => m + (s.durationS ?? 0), 0) / 60,
  );

  const xpForSet = (s: SetRow): number | null => {
    const ex = byId.get(s.exerciseId);
    if (!ex || s.isWarmup) return null;
    if (ex.category === 'cardio') return cardioXp(cardioMinutesDone, Math.floor((s.durationS ?? 0) / 60)) || null;
    const { perWorkingSet, maxSetXpPerWorkout } = xpRules.consistency;
    return (completedWorking + 1) * perWorkingSet <= maxSetXpPerWorkout ? perWorkingSet : null;
  };

  const complete = (s: SetRow) => {
    const finishing = s.completedAt === null;
    setCompleted(s.id, finishing);
    if (!finishing) return;
    const ex = byId.get(s.exerciseId);
    if (ex && isPrSet(s, ex)) haptics.pr();
    else haptics.setComplete();
    if (ex?.category !== 'cardio' && !s.isWarmup) startRest();
    const group = groups.find((g) => g.exerciseId === s.exerciseId);
    const next = group?.sets.find((x) => x.id !== s.id && x.completedAt === null);
    setExpanded(next?.id ?? null);
  };

  const finish = () => {
    if (!workout) return;
    const run = () => {
      stopRest();
      setExpanded(null);
      const summary = finishWorkout(workout.id);
      if (!summary) {
        router.replace('/');
        return;
      }
      haptics.success();
      setLastSummary(summary);
      router.replace('/workout/summary');
    };
    const done = sets.filter((s) => s.completedAt).length;
    if (done === 0) {
      Alert.alert('No sets completed', 'Finishing now will discard this workout.', [
        { text: 'Keep training', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: run },
      ]);
    } else if (done < sets.length) {
      Alert.alert('Finish workout?', `${sets.length - done} unfinished set${sets.length - done === 1 ? '' : 's'} will be dropped.`, [
        { text: 'Keep training', style: 'cancel' },
        { text: 'Finish', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const discard = () => {
    if (!workout) return;
    Alert.alert('Discard workout?', 'Nothing from this session will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          stopRest();
          discardWorkout(workout.id);
          router.replace('/');
        },
      },
    ]);
  };

  const bonusRound = (exerciseId: string) => {
    const last = [...(groups.find((g) => g.exerciseId === exerciseId)?.sets ?? [])].reverse().find((s) => s.completedAt);
    if (!last) return;
    haptics.setComplete();
    updateSet(last.id, { durationS: (last.durationS ?? 0) + 5 * 60 });
  };

  if (!workout) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text variant="heading">No workout in progress</Text>
          <Button label="Back home" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
        <View style={styles.headerText}>
          <Text variant="heading">Workout</Text>
          <Elapsed since={workout.startedAt.getTime()} />
        </View>
        <Button label="Finish" onPress={finish} silent />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {groups.length === 0 ? (
          <View style={styles.emptyWorkout}>
            <Text variant="title" align="center">
              Let’s get moving
            </Text>
            <Text color="inkMuted" align="center">
              Add your first exercise. Sets come pre-filled from last time.
            </Text>
          </View>
        ) : null}

        {groups.map(({ exerciseId, sets: exSets }) => {
          const ex = byId.get(exerciseId);
          if (!ex) return null;
          const hasDoneCardio = ex.category === 'cardio' && exSets.some((s) => s.completedAt);
          const bonus = hasDoneCardio ? cardioXp(cardioMinutesDone, 5) : 0;
          return (
            <ExerciseCard
              key={exerciseId}
              exercise={ex}
              sets={exSets}
              lastTime={lastSessionSets(exerciseId, workout.id)}
              unit={unit}
              expandedSetId={expandedSetId}
              prSetIds={prSetIds}
              xpForSet={xpForSet}
              bonusRoundXp={bonus > 0 ? bonus : null}
              onExpand={setExpanded}
              onComplete={complete}
              onChangeSet={(id, patch) => updateSet(id, patch)}
              onDeleteSet={(id) => deleteSet(id)}
              onAddSet={() => setExpanded(addSet(workout.id, exerciseId))}
              onRemove={() => removeExerciseFromWorkout(workout.id, exerciseId)}
              onBonusRound={() => bonusRound(exerciseId)}
            />
          );
        })}

        <Button
          label="Add exercise"
          variant={groups.length === 0 ? 'primary' : 'secondary'}
          size="lg"
          icon={<PlusIcon color={groups.length === 0 ? colors.onPrimary : colors.ink} size={20} />}
          onPress={() => router.push('/workout/picker')}
        />
        <Button label="Discard workout" variant="ghost" onPress={discard} />
      </ScrollView>

      <View style={styles.restSlot} pointerEvents="box-none">
        <RestTimerBar />
      </View>
    </SafeAreaView>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text variant="caption" color="inkMuted" tabular>
      {formatDuration((now - since) / 1000)}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  headerText: { flex: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: 120,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  emptyWorkout: { paddingVertical: space.xxxl, gap: space.sm },
  restSlot: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xxl,
  },
});
