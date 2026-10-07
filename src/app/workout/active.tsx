import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises, toExerciseInfo, type ExerciseRow } from '@/db/repositories/exercises';
import {
  beginWorkout,
  deleteSet,
  discardWorkout,
  getActiveWorkout,
  groupByExercise,
  lastSessionSets,
  listRecords,
  removeExerciseFromWorkout,
  setCompleted,
  setSetCount,
  setsForWorkout,
  toSetInput,
  updateSet,
  updateSetCascade,
  type SetRow,
} from '@/db/repositories/workouts';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Chip, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon, PlusIcon } from '@/design/icons/Icons';
import { colors, motion, radii, space } from '@/design/tokens';
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
  const { startRest, stopRest, setLastSummary } = useWorkoutUi();

  const planning = workout?.status === 'planning';
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const groups = groupByExercise(sets);
  const unit = profile?.unitPref ?? 'kg';
  const engineRecords = records.map((r) => ({ ...r, achievedAt: r.achievedAt.getTime() }));

  const isPrSet = (s: SetRow, ex: ExerciseRow) =>
    !planning && setBeatsRecords(toSetInput(s), toExerciseInfo(ex), engineRecords).length > 0;
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
  };

  const start = () => {
    if (!workout) return;
    haptics.success();
    beginWorkout(workout.id);
  };

  const finish = () => {
    if (!workout) return;
    const run = () => {
      stopRest();
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
    Alert.alert(planning ? 'Discard this plan?' : 'Discard workout?', 'Nothing from this session will be saved.', [
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

  const totalSets = sets.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
        <View style={styles.headerText}>
          {planning ? (
            <Animated.View entering={FadeIn}>
              <Text variant="heading">Plan your workout</Text>
              <Text variant="caption" color="inkMuted">
                {groups.length} exercise{groups.length === 1 ? '' : 's'} · {totalSets} sets · timer starts when you do
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn}>
              <Text variant="heading">Workout</Text>
              <Elapsed since={workout.startedAt.getTime()} />
            </Animated.View>
          )}
        </View>
        {planning ? <Chip label="Planning" tone="accentSoft" textColor="accentInk" /> : <Button label="Finish" onPress={finish} silent />}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {groups.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(motion.duration.slow)} style={styles.emptyWorkout}>
            <Text variant="title" align="center">
              {planning ? 'What are you training?' : 'Let’s get moving'}
            </Text>
            <Text color="inkMuted" align="center">
              {planning
                ? 'Add your exercises and set targets. Sets come pre-filled from last time.'
                : 'Add exercises as you go. Sets come pre-filled from last time.'}
            </Text>
          </Animated.View>
        ) : null}

        {groups.map(({ exerciseId, sets: exSets }) => {
          const ex = byId.get(exerciseId);
          if (!ex) return null;
          const hasDoneCardio = !planning && ex.category === 'cardio' && exSets.some((s) => s.completedAt);
          const bonus = hasDoneCardio ? cardioXp(cardioMinutesDone, 5) : 0;
          return (
            <ExerciseCard
              key={exerciseId}
              exercise={ex}
              sets={exSets}
              lastTime={lastSessionSets(exerciseId, workout.id)}
              unit={unit}
              planning={planning}
              prSetIds={prSetIds}
              xpForSet={xpForSet}
              bonusRoundXp={bonus > 0 ? bonus : null}
              onComplete={complete}
              onField={(id, field, value) => updateSetCascade(id, field, value)}
              onToggleWarmup={(s) => updateSet(s.id, { isWarmup: !s.isWarmup })}
              onDeleteSet={(id) => deleteSet(id)}
              onSetCount={(n) => setSetCount(workout.id, exerciseId, n)}
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
        <Button label={planning ? 'Discard plan' : 'Discard workout'} variant="ghost" onPress={discard} />
      </ScrollView>

      {planning ? (
        <Animated.View entering={FadeInDown.duration(motion.duration.base)} style={styles.startBar}>
          <Button label="Start workout" size="lg" onPress={start} disabled={groups.length === 0} silent />
        </Animated.View>
      ) : (
        <View style={styles.restSlot} pointerEvents="box-none">
          <RestTimerBar />
        </View>
      )}
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
      {formatDuration(Math.max(0, (now - since) / 1000))}
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
    paddingBottom: 140,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  emptyWorkout: { paddingVertical: space.xxxl, gap: space.sm },
  restSlot: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xxl,
  },
  startBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    paddingBottom: space.xxl,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
});
