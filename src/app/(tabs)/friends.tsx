import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, PressableScale, Text } from '@/design/components';
import { ChevronRightIcon, PlusIcon } from '@/design/icons/Icons';
import { FriendsIcon } from '@/design/icons/TabIcons';
import { colors, radii, space } from '@/design/tokens';
import { useSession } from '@/features/account/auth';
import { cloudConfigured } from '@/features/account/supabase';
import { listMyGroups } from '@/features/social/api';
import { useRemote } from '@/features/social/useRemote';

export default function Friends() {
  const { session, ready } = useSession();
  const signedIn = !!session;
  const groups = useRemote(listMyGroups, signedIn);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={signedIn ? <RefreshControl refreshing={groups.loading && !!groups.data} onRefresh={groups.refresh} /> : undefined}>
        <View style={styles.header}>
          <Text variant="title">Friends</Text>
          {signedIn ? (
            <Button label="Add" variant="secondary" icon={<PlusIcon color={colors.ink} size={18} />} onPress={() => router.push('/group/add')} />
          ) : null}
        </View>

        {!cloudConfigured || !ready ? null : !signedIn ? (
          <Card style={styles.empty}>
            <View style={styles.emptyIcon}>
              <FriendsIcon color={colors.accentInk} size={32} />
            </View>
            <Text variant="heading" align="center">
              Train with friends
            </Text>
            <Text color="inkMuted" align="center">
              Sign in to create a group, invite friends with a code and race up a weekly leaderboard.
            </Text>
            <Button label="Sign in" onPress={() => router.push('/account/sign-in')} />
          </Card>
        ) : groups.error && !groups.data ? (
          <Card style={styles.empty}>
            <Text color="inkMuted" align="center">
              Couldn’t load your groups. {groups.error}
            </Text>
            <Button label="Try again" variant="secondary" onPress={groups.refresh} />
          </Card>
        ) : groups.data && groups.data.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              No groups yet
            </Text>
            <Text color="inkMuted" align="center">
              Start one and share the code, or join a friend’s with theirs.
            </Text>
            <Button label="Create or join a group" onPress={() => router.push('/group/add')} />
          </Card>
        ) : (
          (groups.data ?? []).map((g, i) => (
            <Animated.View key={g.id} entering={FadeInDown.delay(i * 50).duration(260)}>
              <PressableScale onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}>
                <Card style={styles.group}>
                  <View style={styles.groupIcon}>
                    <Text variant="heading" color="accentInk">
                      {g.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text variant="heading" numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text variant="caption" color="inkMuted">
                      {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </Text>
                  </View>
                  <ChevronRightIcon color={colors.inkFaint} size={18} />
                </Card>
              </PressableScale>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.sm, marginBottom: space.xs },
  empty: { gap: space.md, alignItems: 'stretch', paddingVertical: space.xl },
  emptyIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: space.xxs },
});
