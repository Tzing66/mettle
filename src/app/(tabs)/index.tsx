import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, PressableScale, ProgressBar, RankBadge, Ring, Screen, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronRightIcon, FlameIcon, PlusIcon } from '@/design/icons/Icons';
import { rankColors, rankInk, space } from '@/design/tokens';
import { formatDay, formatDurationMs, formatNumber } from '@/features/format';
import { useHomeStats } from '@/features/home/useHomeStats';
import { useProfile } from '@/features/profile/useProfile';
import { makeStyles, useTheme } from '@/design/theme';

const enter = (i: number) => FadeInDown.delay(i * 60).duration(320);

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const profile = useProfile();
  const stats = useHomeStats();
  const { rank } = stats;
  const target = profile?.weeklyTargetDays ?? 3;

  const active = stats.activeWorkout;
  const start = () => {
    haptics.tick();
    router.push(active ? '/workout/active' : '/workout/start');
  };

  return (
    <Screen>
      <Animated.View entering={enter(0)} style={styles.greeting}>
        <Text variant="caption" color="inkMuted">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Text variant="title">Hi, {profile?.displayName ?? 'there'}</Text>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <PressableScale onPress={() => router.push('/progress')} accessibilityLabel="Progression ladder">
          <Card style={styles.rankCard}>
            <View style={styles.rankTop}>
              <RankBadge rank={rank.rank} size={64} />
              <View style={styles.flex}>
                <Text variant="overline" style={{ color: rankInk[rank.rank] }}>
                  {rank.rank} rank
                </Text>
                <Text variant="title">Level {rank.label}</Text>
              </View>
              <ChevronRightIcon color={colors.inkFaint} size={20} />
            </View>
            <ProgressBar progress={rank.levelProgress} fill={rankColors[rank.rank]} />
            <View style={styles.rankFooter}>
              <Text variant="caption" color="inkMuted" tabular>
                {formatNumber(rank.totalXp)} XP
              </Text>
              <Text variant="caption" color="inkMuted" tabular>
                {formatNumber(rank.nextLevelXp - rank.totalXp)} to {rank.level < 5 || rank.rank === 'S' ? `${rank.rank}${rank.level + 1}` : `${rank.nextRank}1`}
              </Text>
            </View>
          </Card>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={enter(2)} style={styles.row}>
        <Card style={[styles.half, styles.goal]}>
          <Ring progress={stats.daysThisWeek / target} size={56} stroke={6} color={stats.weekGoalHit ? colors.accent : colors.ink}>
            <Text variant="label" tabular>
              {stats.daysThisWeek}/{target}
            </Text>
          </Ring>
          <View style={styles.flex}>
            <Text variant="label">This week</Text>
            <Text variant="caption" color="inkMuted">
              {stats.weekGoalHit ? 'Goal hit' : `${Math.max(0, target - stats.daysThisWeek)} to go`}
            </Text>
          </View>
        </Card>
        <Card style={[styles.half, styles.goal]}>
          <View style={styles.flame}>
            <FlameIcon color={stats.streakWeeks > 0 ? colors.prInk : colors.inkFaint} size={26} />
          </View>
          <View style={styles.flex}>
            <Text variant="label" tabular>
              {stats.streakWeeks} week{stats.streakWeeks === 1 ? '' : 's'}
            </Text>
            <Text variant="caption" color="inkMuted">
              Streak
            </Text>
          </View>
        </Card>
      </Animated.View>

      {!stats.placed ? (
        <Animated.View entering={enter(3)}>
          <Card tone="accentSoft" style={styles.placementHint}>
            <Text variant="label" color="accentInk">
              Your first workout places you
            </Text>
            <Text variant="caption" color="inkMuted">
              Just log a normal session. Most lifts, machines, cable moves, bodyweight exercises, planks and 5 km runs have standards. Mettle
              compares your sets with them for your size, age and sex and starts you at the right rank, up to A1.
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(3)}>
        <Button
          label={!active ? 'Start workout' : active.status === 'planning' ? 'Continue planning' : 'Resume workout'}
          size="lg"
          icon={active ? undefined : <PlusIcon color={colors.onPrimary} size={20} />}
          onPress={start}
          silent
        />
      </Animated.View>

      <Animated.View entering={enter(4)} style={styles.section}>
        <Text variant="overline" color="inkMuted">
          Last workout
        </Text>
        {stats.lastWorkout ? (
          <PressableScale
            accessibilityLabel="Open last workout"
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: stats.lastWorkout!.id } })}>
          <Card style={styles.last}>
            <View style={styles.lastTop}>
              <Text variant="heading">{formatDay(stats.lastWorkout.endedAt)}</Text>
              <Text variant="label" color="xpInk" tabular>
                +{formatNumber(stats.lastWorkout.xp)} XP
              </Text>
            </View>
            <Text variant="caption" color="inkMuted">
              {formatDurationMs(stats.lastWorkout.durationMs)} · {stats.lastWorkout.sets} sets
            </Text>
            <Text color="inkMuted" numberOfLines={2}>
              {stats.lastWorkout.exercises.join(' · ')}
            </Text>
          </Card>
          </PressableScale>
        ) : (
          <Card>
            <Text color="inkMuted">Your first workout will show up here. Every set counts.</Text>
          </Card>
        )}
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  placementHint: { gap: space.xs },
  greeting: { gap: space.xxs, paddingTop: space.sm },
  flex: { flex: 1, gap: space.xxs },
  rankCard: { gap: space.md },
  rankTop: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  rankFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  flame: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  section: { gap: space.sm },
  last: { gap: space.xs },
  lastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}));
