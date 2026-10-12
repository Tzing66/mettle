// Import a routine a friend shared: enter the code, preview, add.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getExercise } from '@/db/repositories/exercises';
import { createRoutine, fromSharedItems, type SharedItem } from '@/db/repositories/routines';
import { Button, Card, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space, type } from '@/design/tokens';
import { fetchSharedRoutine, normaliseCode } from '@/features/routines/share';

export default function ImportRoutine() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ name: string; items: SharedItem[] } | null>(null);

  const lookUp = async () => {
    if (normaliseCode(code).length < 8) return;
    setLoading(true);
    setError(null);
    try {
      const routine = await fetchSharedRoutine(code);
      if (!routine) setError('No routine with that code. Check it and try again.');
      setFound(routine);
    } catch (e) {
      setError(`Couldn’t look it up. ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const add = () => {
    if (!found) return;
    const { items, skipped } = fromSharedItems(found.items);
    if (items.length === 0) {
      setError('None of its exercises are available in this version of the app.');
      return;
    }
    createRoutine(found.name, items);
    haptics.success();
    if (skipped > 0) Alert.alert('Routine added', `${skipped} exercise${skipped === 1 ? ' isn’t' : 's aren’t'} in this version of the app and ${skipped === 1 ? 'was' : 'were'} left out.`);
    router.back();
  };

  const nameOf = (item: SharedItem) => item.custom?.name ?? getExercise(item.exercise_id)?.name ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text variant="title">Import a routine</Text>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            keyboardAppearance={scheme}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setFound(null);
              setError(null);
            }}
            placeholder="Code, e.g. K7QX2M4P"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={12}
            returnKeyType="search"
            onSubmitEditing={lookUp}
            style={styles.input}
          />
          {found ? null : <Button label={loading ? 'Looking up…' : 'Look up'} onPress={lookUp} disabled={loading || normaliseCode(code).length < 8} />}
          {error ? <Text color="prInk">{error}</Text> : null}

          {found ? (
            <Card style={styles.preview}>
              <Text variant="heading">{found.name}</Text>
              {found.items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <Text style={styles.flex} color={nameOf(item) ? 'ink' : 'inkFaint'} numberOfLines={1}>
                    {nameOf(item) ?? 'Exercise not in this app version (skipped)'}
                  </Text>
                  <Text variant="caption" color="inkMuted" tabular>
                    {item.sets.filter((s) => !s.is_warmup).length} × {item.sets.find((s) => s.reps)?.reps ?? '–'}
                  </Text>
                </View>
              ))}
              <Text variant="caption" color="inkFaint">
                Weights aren’t shared. When you start it, weights fill in from your own last session.
              </Text>
              <Button label="Add to my routines" size="lg" onPress={add} />
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.sm },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  input: {
    ...type.heading,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    padding: space.md,
    letterSpacing: 4,
  },
  preview: { gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
}));
