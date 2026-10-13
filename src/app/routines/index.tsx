// Your routines and the starters: tap one to see it, Start to plan it.
import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises } from '@/db/repositories/exercises';
import { listRoutines, starterRoutines, type RoutineRow } from '@/db/repositories/routines';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Card, Chip, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon, DotsIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space } from '@/design/tokens';
import { confirmDeleteRoutine, shareRoutineWithCode, startRoutine } from '@/features/routines/actions';

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
  const names = useDbQuery(() => new Map(listExercises().map((e) => [e.id, e.name])), ['exercises']);

  const menu = (r: RoutineRow) => {
    haptics.tick();
    Alert.alert(r.name, undefined, [
      { text: 'Share with a code', onPress: () => shareRoutineWithCode(r) },
      { text: 'Rename', onPress: () => router.push({ pathname: '/routines/name', params: { id: r.id } }) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteRoutine(r) },
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
            <PressableScale
              accessibilityLabel={`Open ${routine.name}`}
              onPress={() => router.push({ pathname: '/routines/[id]', params: { id: routine.id } })}
              scaleTo={0.98}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="heading" numberOfLines={1}>
                      {routine.name}
                    </Text>
                    <Text variant="caption" color="inkMuted">
                      {exercises.length} exercise{exercises.length === 1 ? '' : 's'} · {sets} sets
                    </Text>
                  </View>
                  <Chip label="Start" tone="accent" textColor="onAccent" onPress={() => startRoutine(routine.items)} />
                  <PressableScale accessibilityLabel={`${routine.name} options`} onPress={() => menu(routine)} style={styles.menu}>
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
          <PressableScale key={r.id} accessibilityLabel={`Start ${r.name}`} onPress={() => startRoutine(r.items)} scaleTo={0.98}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text variant="heading" style={styles.flex}>
                  {r.name}
                </Text>
                <Chip label="Start" tone="accentSoft" textColor="accentInk" onPress={() => startRoutine(r.items)} />
              </View>
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
