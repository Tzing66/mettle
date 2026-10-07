import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button, Card, Text } from '@/design/components';
import { radii, space } from '@/design/tokens';

import { replaceLocalWithAccountData, syncNow, useSyncStore } from '@/features/sync/useSync';

import { accountLabel, deleteAccount, signOut, useSession } from './auth';
import { cloudConfigured } from './supabase';
import { makeStyles, useTheme } from '@/design/theme';

export function AccountCard() {
  const styles = useStyles();
  const { session, ready } = useSession();
  const sync = useSyncStore();
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
      <SyncStatus status={sync.status} error={sync.error} lastSyncedAt={sync.lastSyncedAt} />
      {sync.serverXp ? (
        <Text variant="caption" color="inkMuted" tabular>
          Leaderboard XP: {sync.serverXp.granted.toLocaleString()}
          {sync.serverXp.total > sync.serverXp.granted
            ? ` (+${(sync.serverXp.total - sync.serverXp.granted).toLocaleString()} pending)`
            : ''}
        </Text>
      ) : null}
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
      <Button
        label="Delete account"
        variant="ghost"
        onPress={() =>
          Alert.alert(
            'Delete your account?',
            'This permanently deletes your account, your backed-up workouts and your leaderboard XP, and removes you from your groups. Workouts on this phone stay here. This can’t be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete account',
                style: 'destructive',
                onPress: () =>
                  deleteAccount()
                    .then(() => Alert.alert('Account deleted', 'Mettle keeps working offline on this phone.'))
                    .catch((e) => Alert.alert('Couldn’t delete account', e instanceof Error ? e.message : String(e))),
              },
            ],
          )
        }
      />
    </Card>
  );
}

function SyncStatus({ status, error, lastSyncedAt }: { status: string; error: string | null; lastSyncedAt: Date | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (status === 'mismatch') {
    return (
      <View style={styles.notice}>
        <Text variant="label">This phone holds another account’s workouts</Text>
        <Text variant="caption" color="inkMuted">
          To protect them, nothing was synced. You can replace what’s on this phone with this account’s data, or sign out.
        </Text>
        <Button
          label="Use this account’s data"
          variant="secondary"
          onPress={() =>
            Alert.alert('Replace this phone’s data?', 'Workouts on this phone that belong to the other account will be removed from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Replace', style: 'destructive', onPress: () => replaceLocalWithAccountData() },
            ])
          }
        />
      </View>
    );
  }
  const label =
    status === 'syncing'
      ? 'Backing up…'
      : status === 'error'
        ? `Backup failed: ${error ?? 'unknown error'}`
        : lastSyncedAt
          ? `Backed up ${timeAgo(lastSyncedAt)}`
          : 'Not backed up yet';
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: status === 'error' ? colors.pr : status === 'syncing' ? colors.xp : colors.accent }]} />
      <Text variant="caption" color={status === 'error' ? 'prInk' : 'inkMuted'} style={styles.flex} numberOfLines={2}>
        {label}
      </Text>
      {status === 'error' || status === 'idle' ? (
        <Button label="Sync now" variant="ghost" onPress={() => syncNow()} />
      ) : null}
    </View>
  );
}

function timeAgo(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return d.toLocaleDateString();
}

const useStyles = makeStyles((colors) => ({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: radii.pill },
  notice: { gap: space.sm, padding: space.md, borderRadius: radii.md, backgroundColor: colors.sunken },
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
}));
