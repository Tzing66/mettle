import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExercises, recentExerciseIds, toggleFavourite, type ExerciseRow } from '@/db/repositories/exercises';
import { addExerciseToWorkout, getActiveWorkout, setsForWorkout, startWorkout } from '@/db/repositories/workouts';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, ExerciseTile, SegmentedTabs, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { CheckIcon, PlusIcon, SearchIcon } from '@/design/icons/Icons';
import { radii, space, type } from '@/design/tokens';
import type { ExerciseCategory } from '@/engine';
import { makeStyles, useTheme } from '@/design/theme';

const TABS: { key: ExerciseCategory; label: string }[] = [
  { key: 'free_weight', label: 'Free weights' },
  { key: 'machine', label: 'Machines' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'cardio', label: 'Cardio' },
];
const COLUMNS = 3;

export default function Picker() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<ExerciseCategory>('free_weight');
  const [query, setQuery] = useState('');
  const exercises = useDbQuery(listExercises, ['exercises']);
  const recentIds = useDbQuery(() => recentExerciseIds(10), ['workout_sets']);
  const inWorkout = useDbQuery(() => {
    const w = getActiveWorkout();
    return new Set(w ? setsForWorkout(w.id).map((s) => s.exerciseId) : []);
  }, ['workout_sets', 'workouts']);

  const tileWidth = (width - space.lg * 2 - space.md * (COLUMNS - 1)) / COLUMNS;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const q = query.trim().toLowerCase();
  const searchResults = q
    ? exercises.filter((e) => e.name.toLowerCase().includes(q) || e.primaryMuscles.some((m) => m.includes(q)))
    : null;
  const favourites = exercises.filter((e) => e.isFavourite);
  const recent = recentIds.map((id) => byId.get(id)).filter((e): e is ExerciseRow => !!e);

  const add = (exercise: ExerciseRow) => {
    if (inWorkout.has(exercise.id)) return;
    const workoutId = getActiveWorkout()?.id ?? startWorkout();
    addExerciseToWorkout(workoutId, exercise);
    haptics.setComplete();
  };

  const tile = (e: ExerciseRow, w = tileWidth) => (
    <View key={e.id}>
      <ExerciseTile
        name={e.name}
        short={e.shortName}
        icon={e.icon}
        category={e.category}
        favourite={e.isFavourite}
        width={w}
        onPress={() => add(e)}
        onLongPress={() => toggleFavourite(e.id)}
      />
      {inWorkout.has(e.id) ? (
        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(320)} style={styles.added}>
          <CheckIcon color={colors.onPrimary} size={14} />
        </Animated.View>
      ) : null}
    </View>
  );

  const row = (title: string, items: ExerciseRow[]) =>
    items.length ? (
      <View style={styles.section}>
        <Text variant="overline" color="inkMuted">
          {title}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
          {items.map((e) => tile(e, tileWidth * 0.82))}
        </ScrollView>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="title">Add exercise</Text>
        <Button label={inWorkout.size ? `Done · ${inWorkout.size}` : 'Done'} onPress={() => router.back()} />
      </View>

      <View style={styles.search}>
        <SearchIcon color={colors.inkMuted} size={18} />
        <TextInput
          keyboardAppearance={scheme}
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises or muscles"
          placeholderTextColor={colors.inkFaint}
          style={styles.searchInput}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Virtualised grid: only tiles near the screen are drawn (each tile is an SVG figure). */}
      <FlatList
        data={searchResults ?? exercises.filter((e) => e.category === tab)}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => tile(item)}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          searchResults ? null : (
            <View style={styles.listHeader}>
              {row('Favourites', favourites)}
              {row('Recent', recent)}
              <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
            </View>
          )
        }
        ListEmptyComponent={searchResults ? <Text color="inkMuted">No matches for “{query.trim()}”.</Text> : null}
        ListFooterComponent={
          <View style={styles.listFooter}>
            {searchResults ? (
              <Button
                label={`Create “${query.trim()}”`}
                variant={searchResults.length ? 'ghost' : 'secondary'}
                icon={<PlusIcon color={searchResults.length ? colors.accentInk : colors.ink} size={18} />}
                onPress={() => router.push({ pathname: '/exercise/new', params: { name: query.trim() } })}
              />
            ) : (
              <>
                <Text variant="caption" color="inkFaint" align="center">
                  Long-press a tile to favourite it
                </Text>
                <Button label="Can’t find it? Create your own" variant="ghost" onPress={() => router.push('/exercise/new')} />
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  searchInput: {
    ...type.body,
    flex: 1,
    color: colors.ink,
    paddingVertical: space.md,
  },
  content: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xxxl,
  },
  section: { gap: space.sm },
  hRow: { gap: space.md },
  gridRow: { gap: space.md },
  listHeader: { gap: space.lg, marginBottom: space.lg },
  listFooter: { gap: space.md, marginTop: space.md },
  added: {
    position: 'absolute',
    top: space.xs + 2,
    left: space.xs + 2,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
