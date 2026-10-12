// Name a routine: save a workout (or plan) as one, or rename an existing one.
//   ?id=…                     rename
//   ?workoutId=…&completed=1  save a finished workout's completed sets
//   ?workoutId=…              save a plan's sets
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createRoutine, getRoutine, renameRoutine, routineItemsFromWorkout } from '@/db/repositories/routines';
import { Button, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space, type } from '@/design/tokens';

export default function NameRoutine() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const params = useLocalSearchParams<{ id?: string; workoutId?: string; completed?: string }>();
  const existing = params.id ? getRoutine(params.id) : null;
  const [name, setName] = useState(existing?.name ?? '');

  const save = () => {
    if (!name.trim()) return;
    if (existing) {
      renameRoutine(existing.id, name);
    } else if (params.workoutId) {
      const items = routineItemsFromWorkout(params.workoutId, params.completed === '1');
      if (items.length === 0) return;
      createRoutine(name, items);
    }
    haptics.success();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text variant="title">{existing ? 'Rename routine' : 'Save as routine'}</Text>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
        <View style={styles.content}>
          <TextInput
            keyboardAppearance={scheme}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push day"
            placeholderTextColor={colors.inkFaint}
            autoFocus
            maxLength={60}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={save}
            style={styles.input}
          />
          {existing ? null : (
            <Text color="inkMuted">Saves the exercises, sets, reps and weights. Start it any time from Start → Routines.</Text>
          )}
          <Button label={existing ? 'Rename' : 'Save routine'} size="lg" onPress={save} disabled={!name.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.sm },
  content: { padding: space.lg, gap: space.lg },
  input: {
    ...type.heading,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    padding: space.md,
  },
}));
