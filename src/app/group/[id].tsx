import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Chip, PressableScale, RankBadge, SegmentedTabs, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon } from '@/design/icons/Icons';
import { motion, radii, space } from '@/design/tokens';
import { formatNumber } from '@/features/format';
import { avatarUrl } from '@/features/profile/avatar';
import { getGroup, groupLeaderboard, leaveGroup } from '@/features/social/api';
import { rankLeaderboard, type Period } from '@/features/social/leaderboard';
import { useRemote } from '@/features/social/useRemote';
import { makeStyles, useTheme } from '@/design/theme';

export default function GroupScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<Period>('week');
  const [open, setOpen] = useState<string | null>(null);
  const group = useRemote(() => getGroup(id));
  const board = useRemote(() => groupLeaderboard(id));
  const ranked = board.data ? rankLeaderboard(board.data, period) : [];

  const share = () => {
    if (!group.data) return;
    haptics.tick();
    Share.share({
      message: `Join my Mettle group “${group.data.name}”. Open Mettle → Friends → Add → Join with code: ${group.data.invite_code}`,
    });
  };

  const leave = () =>
    Alert.alert('Leave this group?', 'You can rejoin later with the code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(id);
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t leave', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  const refresh = () => {
    group.refresh();
    board.refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
        <Text variant="heading" numberOfLines={1} style={styles.flex}>
          {group.data?.name ?? ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
        <SegmentedTabs
          options={[
            { key: 'week', label: 'This week' },
            { key: 'all', label: 'All time' },
          ]}
          value={period}
          onChange={setPeriod}
        />

        {board.error && !board.data ? (
          <Card>
            <Text color="inkMuted">Couldn’t load the leaderboard. {board.error}</Text>
          </Card>
        ) : (
          <Card padded={false}>
            {ranked.map((r, i) => (
              <Animated.View
                key={r.user_id}
                layout={LinearTransition.duration(motion.duration.slow)}
                entering={FadeInDown.delay(i * 40).duration(240)}
                style={[i > 0 && styles.divider, r.is_me && styles.me]}>
                <PressableScale
                  accessibilityLabel={`${r.display_name}, show profile`}
                  scaleTo={0.99}
                  onPress={() => {
                    haptics.tick();
                    setOpen(open === r.user_id ? null : r.user_id);
                  }}
                  style={styles.row}>
                  <Text variant="heading" color={r.place !== null && r.place <= 3 ? 'ink' : 'inkMuted'} tabular style={styles.place}>
                    {r.place ?? '–'}
                  </Text>
                  <Avatar uri={avatarUrl(r.avatar_path)} name={r.display_name} size={36} />
                  <View style={styles.flex}>
                    <Text variant="label" numberOfLines={1}>
                      {r.display_name}
                      {r.is_me ? ' (you)' : ''}
                    </Text>
                    <Text variant="caption" color="inkMuted">
                      Level {r.levelLabel}
                      {r.role === 'owner' ? ' · owner' : ''}
                    </Text>
                  </View>
                  <RankBadge rank={r.rank} size={24} />
                  <Text variant="label" tabular style={styles.xp}>
                    {r.xp > 0 ? `${formatNumber(r.xp)} XP` : '–'}
                  </Text>
                </PressableScale>
                {open === r.user_id ? (
                  <Animated.View entering={FadeInDown.duration(motion.duration.base)} style={styles.card}>
                    {r.about || r.goals ? (
                      <>
                        {r.about ? <Text>{r.about}</Text> : null}
                        {r.goals ? (
                          <Text color="inkMuted">
                            <Text variant="label" color="inkMuted">
                              Goals:{' '}
                            </Text>
                            {r.goals}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text color="inkFaint">{r.is_me ? 'Add an about me and goals on your Profile tab.' : 'Nothing here yet.'}</Text>
                    )}
                  </Animated.View>
                ) : null}
              </Animated.View>
            ))}
          </Card>
        )}
        <Text variant="caption" color="inkFaint">
          {period === 'week' ? 'Monday to Sunday in your time zone. ' : ''}Only confirmed XP counts. Big jumps count once you repeat them.
        </Text>

        {group.data ? (
          <Card style={styles.invite}>
            <Text variant="overline" color="inkMuted">
              Invite code
            </Text>
            <View style={styles.codeRow}>
              <Text variant="number" selectable style={styles.code}>
                {group.data.invite_code}
              </Text>
              <Chip label={`${group.data.memberCount}/50`} />
            </View>
            <Button label="Share invite" onPress={share} silent />
          </Card>
        ) : null}

        <Button label="Leave group" variant="ghost" onPress={leave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  flex: { flex: 1, gap: space.xxs },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.line },
  me: { backgroundColor: colors.accentSoft },
  place: { width: 24, textAlign: 'center' },
  xp: { minWidth: 64, textAlign: 'right' },
  card: { gap: space.xs, paddingHorizontal: space.md, paddingBottom: space.md, paddingLeft: 24 + space.md * 2 + 36 },
  invite: { gap: space.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { letterSpacing: 6 },
}));
