import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/design/components';
import { colors, radii, space } from '@/design/tokens';

import { accountLabel, signOut, useSession } from './auth';
import { cloudConfigured } from './supabase';

export function AccountCard() {
  const { session, ready } = useSession();
  if (!cloudConfigured || !ready) return null;

  if (!session) {
    return (
      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Account
        </Text>
        <Text color="inkMuted">Back up your workouts and join friends on the leaderboard.</Text>
        <Button label="Sign in" onPress={() => router.push('/account/sign-in')} />
      </Card>
    );
  }

  const { name, detail } = accountLabel(session);
  return (
    <Card style={styles.card}>
      <Text variant="overline" color="inkMuted">
        Account
      </Text>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text variant="heading" color="accentInk">
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="inkMuted" numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </View>
      <Button
        label="Sign out"
        variant="ghost"
        onPress={() =>
          Alert.alert('Sign out?', 'Your workouts stay on this phone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => signOut().catch((e) => Alert.alert('Sign out failed', String(e))) },
          ])
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: space.xxs },
});
