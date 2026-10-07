// Progression ladder: every rank and level, the XP each needs, and where you are.
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { totalXpFromDb } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { Card, Chip, PressableScale, ProgressBar, RankBadge, Text } from '@/design/components';
import { CheckIcon, ChevronLeftIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, rankColors, rankInk, space } from '@/design/tokens';
import { rankFor, rankLadder } from '@/engine';
import { formatNumber } from '@/features/format';

export default function Progress() {
  const styles = useStyles();
  const { colors } = useTheme();
  const xp = useDbQuery(totalXpFromDb, ['xp_events']);
  const now = rankFor(xp);
  const ladder = rankLadder(xp);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ChevronLeftIcon color={colors.ink} />
        </PressableScale>
        <Text variant="heading">Progression</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <RankBadge rank={now.rank} size={72} />
          <View style={styles.flex}>
            <Text variant="title">Level {now.label}</Text>
            <Text color="inkMuted" tabular>
              {formatNumber(xp)} XP total
            </Text>
            <Text variant="caption" color="inkMuted" tabular>
              {now.nextRank
                ? `${formatNumber(now.nextLevelXp - xp)} to the next level · ${formatNumber(now.xpToNextRank ?? 0)} to ${now.nextRank} rank`
                : `${formatNumber(now.nextLevelXp - xp)} to ${now.rank}${now.level + 1}`}
            </Text>
          </View>
        </Card>

        {ladder.map((r, ri) => (
          <Animated.View key={r.rank} entering={FadeInDown.delay(ri * 50).duration(260)}>
            <Card style={[styles.rankCard, !r.reached && styles.dim]}>
              <View style={styles.rankHeader}>
                <RankBadge rank={r.rank} size={40} />
                <View style={styles.flex}>
                  <Text variant="heading">{r.rank} rank</Text>
                  <Text variant="caption" color="inkMuted" tabular>
                    from {formatNumber(r.minXp)} XP
                  </Text>
                </View>
                {r.reached ? (
                  <Chip label={now.rank === r.rank ? 'You are here' : 'Reached'} tone={now.rank === r.rank ? 'accentSoft' : 'sunken'} textColor={now.rank === r.rank ? 'accentInk' : 'inkMuted'} />
                ) : (
                  <Text variant="caption" color="inkMuted" tabular>
                    {formatNumber(r.xpAway)} XP away
                  </Text>
                )}
              </View>

              {r.levels.map((l) => (
                <View key={l.label} style={[styles.level, l.state === 'current' && { backgroundColor: rankColors[r.rank] + '33' }]}>
                  <View style={[styles.levelDot, l.state !== 'ahead' && { backgroundColor: rankColors[r.rank] }]}>
                    {l.state === 'done' ? <CheckIcon color={rankInk[r.rank]} size={12} /> : null}
                  </View>
                  <View style={styles.flex}>
                    <Text variant="label" color={l.state === 'ahead' ? 'inkMuted' : 'ink'}>
                      {l.label}
                      {l.state === 'current' ? '  · you are here' : ''}
                    </Text>
                    {l.state === 'current' ? (
                      <ProgressBar progress={(xp - l.startXp) / (l.endXp - l.startXp)} fill={rankColors[r.rank]} height={6} style={styles.levelBar} />
                    ) : null}
                  </View>
                  <Text variant="caption" color="inkMuted" tabular>
                    {l.state === 'ahead' ? `+${formatNumber(l.xpAway)}` : `${formatNumber(l.startXp)}`}
                  </Text>
                </View>
              ))}
              {r.rank === 'S' ? (
                <Text variant="caption" color="inkFaint">
                  S keeps going: a new level every {formatNumber(r.levels[1].startXp - r.levels[0].startXp)} XP.
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  flex: { flex: 1, gap: space.xxs },
  rankCard: { gap: space.xs, padding: space.md },
  dim: { opacity: 0.85 },
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  level: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs + 2, paddingHorizontal: space.sm, borderRadius: radii.sm },
  levelDot: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBar: { marginTop: space.xs },
}));
