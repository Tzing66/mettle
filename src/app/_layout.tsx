import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDatabaseMigrations } from '@/db/client';
import { ensureSeeded } from '@/db/seed';
import { KeyboardDoneBar, Text } from '@/design/components';
import { colors, space } from '@/design/tokens';
import { SyncController } from '@/features/sync/useSync';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const migrations = useDatabaseMigrations();
  const ready = (fontsLoaded || !!fontError) && (migrations.success || !!migrations.error);

  // The catalogue upsert is synchronous and must finish before any screen reads exercises.
  if (migrations.success) ensureSeeded();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (migrations.error) {
    return (
      <View style={styles.error}>
        <Text variant="heading">Couldn’t open your workout data</Text>
        <Text color="inkMuted">{migrations.error.message}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <KeyboardDoneBar />
      <SyncController />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="workout/start" options={{ presentation: 'transparentModal', animation: 'none' }} />
        <Stack.Screen name="workout/active" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="workout/picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/summary" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="exercise/[id]" />
        <Stack.Screen name="exercise/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account/sign-in" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
    gap: space.sm,
    backgroundColor: colors.bg,
  },
});
