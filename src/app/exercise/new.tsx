import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCustomExercise } from '@/db/repositories/exercises';
import { addExerciseToWorkout, getActiveWorkout } from '@/db/repositories/workouts';
import { Button, OptionRow, SegmentedTabs, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { colors, radii, space, type } from '@/design/tokens';
import type { ExerciseCategory, TrackingType } from '@/engine';

const CATEGORIES: { key: ExerciseCategory; label: string }[] = [
  { key: 'free_weight', label: 'Free weight' },
  { key: 'machine', label: 'Machine' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'cardio', label: 'Cardio' },
];

const TRACKING: Record<ExerciseCategory, { key: TrackingType; label: string; description: string }[]> = {
  free_weight: [{ key: 'weight_reps', label: 'Weight × reps', description: 'e.g. 60 kg × 8' }],
  machine: [{ key: 'weight_reps', label: 'Weight × reps', description: 'e.g. 40 kg × 12' }],
  bodyweight: [
    { key: 'reps', label: 'Reps', description: 'e.g. 15 reps' },
    { key: 'weight_reps', label: 'Added weight × reps', description: 'e.g. +10 kg × 8' },
    { key: 'time', label: 'Time', description: 'e.g. a 45-second hold' },
  ],
  cardio: [
    { key: 'distance_time', label: 'Distance + time', description: 'e.g. 5 km in 28 min' },
    { key: 'time', label: 'Time only', description: 'e.g. 20 minutes' },
  ],
};

export default function NewExercise() {
  const params = useLocalSearchParams<{ name?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [category, setCategory] = useState<ExerciseCategory>('free_weight');
  const [tracking, setTracking] = useState<TrackingType>('weight_reps');
  const options = TRACKING[category];

  const chooseCategory = (c: ExerciseCategory) => {
    setCategory(c);
    setTracking(TRACKING[c][0].key);
  };

  const save = () => {
    if (!name.trim()) return;
    const exercise = createCustomExercise({ name, category, trackingType: tracking });
    const workout = getActiveWorkout();
    if (workout) addExerciseToWorkout(workout.id, exercise);
    haptics.success();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text variant="title">New exercise</Text>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text variant="overline" color="inkMuted">
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Belt squat"
              placeholderTextColor={colors.inkFaint}
              autoFocus={!params.name}
              autoCapitalize="sentences"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text variant="overline" color="inkMuted">
              Category
            </Text>
            <SegmentedTabs options={CATEGORIES} value={category} onChange={chooseCategory} />
          </View>
          {options.length > 1 ? (
            <View style={styles.field}>
              <Text variant="overline" color="inkMuted">
                Track
              </Text>
              {options.map((o) => (
                <OptionRow key={o.key} label={o.label} description={o.description} selected={tracking === o.key} onPress={() => setTracking(o.key)} />
              ))}
            </View>
          ) : null}
          <Text variant="caption" color="inkFaint">
            Custom exercises earn normal XP and PRs. Benchmarks only use the built-in lifts.
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Create and add" size="lg" onPress={save} disabled={!name.trim()} silent />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  content: { padding: space.lg, gap: space.xl },
  field: { gap: space.sm },
  input: {
    ...type.heading,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    padding: space.md,
  },
  footer: { padding: space.lg },
});
