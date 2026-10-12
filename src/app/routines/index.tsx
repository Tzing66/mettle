// Your routines: tap one to plan it; share, rename or delete from its menu.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises } from '@/db/repositories/exercises';
import { deleteRoutine, listRoutines, planFromItems, planFromRoutine, starterRoutines, type RoutineRow, type StarterRoutine } from '@/db/repositories/routines';
import { getActiveWorkout } from '@/db/repositories/workouts';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Card, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon, DotsIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space } from '@/design/tokens';
import { shareMessage, shareRoutine } from '@/features/routines/share';

function readRoutines() {
  const names = new Map(listExercises().map((e) => [e.id, e.name]));
  return listRoutines().map((r) => ({
    routine: r,
    exercises: r.items.flatMap((i) => (names.has(i.exerciseId) ? [names.get(i.exerciseId)!] : [])),
    sets: r.items.reduce((n, i) => n + i.sets.filter((s) => !s.isWarmup).length, 0),
  }));
}

export default function Routines() {
  const styles = useStyles();
  const { colors } = useTheme();
  const rows = useDbQuery(readRoutines, ['routines', 'exercises']);
  const [sharing, setSharing] = useState<string | null>(null);
  const names = useDbQuery(() => new Map(listExercises().map((e) => [e.id, e.name])), ['exercises']);

  const startStarter = (r: StarterRoutine) => {
    if (!noOpenWorkout()) return;
    haptics.success();
    planFromItems(r.items);
    router.replace('/workout/active');
  };

  const noOpenWorkout = () => {
    if (!getActiveWorkout()) return true;
    Alert.alert('You have a workout open', 'Finish or discard it before starting another.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go to it', onPress: () => router.replace('/workout/active') },
    ]);
    return false;
  };

  const start = (r: RoutineRow) => {
    if (!noOpenWorkout()) return;
    haptics.success();
    if (planFromRoutine(r.id)) router.replace('/workout/active');
  };

  const share = async (r: RoutineRow, exercises: string[]) => {
    setSharing(r.id);
    try {
      const code = await shareRoutine(r);
      await Share.share({ message: shareMessage(r, code, exercises) });
    } catch (e) {
      Alert.alert('Couldn’t share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(null);
    }
  };

  const menu = (r: RoutineRow, exercises: string[]) => {
    haptics.tick();
    Alert.alert(r.name, undefined, [
      { text: 'Share with a code', onPress: () => share(r, exercises) },
      { text: 'Rename', onPress: () => router.push({ pathname: '/routines/name', params: { id: r.id } }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Delete “${r.name}”?`, 'Workouts you logged with it stay.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(r.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
        <Text variant="heading" style={styles.flex}>
          Routines
        </Text>
        <Button label="Import" variant="secondary" onPress={() => router.push('/routines/import')} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="overline" color="inkMuted">
          Yours
        </Text>
        {rows.length === 0 ? (
          <Card style={styles.empty}>
            <Text color="inkMuted">
              Open any finished workout and tap “Save as routine”, or save a plan before you start it. Then it’s one tap from here. Got a code from a
              friend? Tap Import.
            </Text>
          </Card>
        ) : null}

        {rows.map(({ routine, exercises, sets }, i) => (
          <Animated.View key={routine.id} entering={FadeInDown.delay(i * 40).duration(240)}>
            <PressableScale accessibilityLabel={`Start ${routine.name}`} onPress={() => start(routine)} scaleTo={0.98}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="heading" numberOfLines={1}>
                      {routine.name}
                    </Text>
                    <Text variant="caption" color="inkMuted">
                      {exercises.length} exercise{exercises.length === 1 ? '' : 's'} · {sets} sets
                      {sharing === routine.id ? ' · sharing…' : ''}
                    </Text>
                  </View>
                  <PressableScale accessibilityLabel={`${routine.name} options`} onPress={() => menu(routine, exercises)} style={styles.menu}>
                    <DotsIcon color={colors.inkMuted} />
                  </PressableScale>
                </View>
                <Text color="inkMuted" numberOfLines={2}>
                  {exercises.join(' · ')}
                </Text>
              </Card>
            </PressableScale>
          </Animated.View>
        ))}

        <Text variant="overline" color="inkMuted" style={styles.sectionGap}>
          Starter routines
        </Text>
        {starters.map((r) => (
          <PressableScale key={r.id} accessibilityLabel={`Start ${r.name}`} onPress={() => startStarter(r)} scaleTo={0.98}>
            <Card style={styles.card}>
              <Text variant="heading">{r.name}</Text>
              <Text color="inkMuted">{r.blurb}</Text>
              <Text variant="caption" color="inkFaint" numberOfLines={2}>
                {r.items.map((i) => names.get(i.exerciseId) ?? i.exerciseId).join(' · ')}
              </Text>
            </Card>
          </PressableScale>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const starters = starterRoutines();

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  flex: { flex: 1, gap: space.xxs },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  empty: { gap: space.sm },
  card: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  menu: { padding: space.sm },
  sectionGap: { marginTop: space.md },
}));
