import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, SegmentedTabs, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { colors, radii, space, type } from '@/design/tokens';
import { createGroup, joinGroup } from '@/features/social/api';

type Mode = 'join' | 'create';

export default function AddGroup() {
  const [mode, setMode] = useState<Mode>('join');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const submit = async () => {
    setBusy(true);
    try {
      const group = mode === 'join' ? await joinGroup(cleanCode) : await createGroup(name.trim());
      haptics.success();
      router.replace({ pathname: '/group/[id]', params: { id: group.id } });
    } catch (e) {
      Alert.alert(mode === 'join' ? 'Couldn’t join' : 'Couldn’t create group', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const ready = mode === 'join' ? cleanCode.length === 6 : name.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text variant="title">Add a group</Text>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SegmentedTabs
            options={[
              { key: 'join', label: 'Join with a code' },
              { key: 'create', label: 'Create new' },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'join' ? (
            <View style={styles.field}>
              <Text color="inkMuted">Ask a friend for their group’s 6-character code.</Text>
              <TextInput
                key="code"
                value={cleanCode}
                onChangeText={setCode}
                placeholder="ABC234"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                maxLength={6}
                style={[styles.input, styles.code]}
              />
            </View>
          ) : (
            <View style={styles.field}>
              <Text color="inkMuted">You’ll get a code to share. Members see each other’s name and XP only.</Text>
              <TextInput
                key="name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Morning crew"
                placeholderTextColor={colors.inkFaint}
                autoFocus
                maxLength={40}
                style={styles.input}
              />
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label={busy ? 'One moment…' : mode === 'join' ? 'Join group' : 'Create group'}
            size="lg"
            onPress={submit}
            disabled={!ready || busy}
            silent
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.md },
  content: { padding: space.lg, gap: space.xl },
  field: { gap: space.md },
  input: {
    ...type.heading,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    padding: space.md,
  },
  code: { ...type.number, letterSpacing: 8, textAlign: 'center' },
  footer: { padding: space.lg },
});
