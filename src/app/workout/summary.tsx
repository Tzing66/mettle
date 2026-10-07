import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/design/components';
import { FlameIcon, TrophyIcon } from '@/design/icons/Icons';
import { radii, space } from '@/design/tokens';
import { kgToLb, type XpEventDraft, type XpReason } from '@/engine';
import { formatDurationMs, formatMetric, formatNumber, TIER_LABELS } from '@/features/format';
import { useProfile } from '@/features/profile/useProfile';
import { CountUp } from '@/features/workout/CountUp';
import { LevelProgress } from '@/features/workout/LevelProgress';
import { RankUpMoment } from '@/features/workout/RankUpMoment';
import { useWorkoutUi } from '@/features/workout/store';
import { makeStyles, useTheme } from '@/design/theme';

const STEP_MS = 220;

/** Summary lines in tally order: base → sets → cardio → PRs → firsts → benchmarks → streak → weekly goal. */
const LINES: { label: string; reasons: XpReason[] }[] = [
  { label: 'Workout complete', reasons: ['workout_complete'] },
  { label: 'Working sets', reasons: ['working_sets'] },
  { label: 'Cardio', reasons: ['cardio_minutes'] },
  { label: 'Personal records', reasons: ['personal_record'] },
  { label: 'Firsts', reasons: ['first_exercise', 'first_activity'] },
  { label: 'Benchmarks', reasons: ['benchmark_tier'] },
  { label: 'Streak bonus', reasons: ['streak_bonus'] },
  { label: 'Weekly goal', reasons: ['weekly_goal'] },
];

export default function Summary() {
  const styles = useStyles();
  const { colors } = useTheme();
  const summary = useWorkoutUi((s) => s.lastSummary);
  const profile = useProfile();
  const unit = profile?.unitPref ?? 'kg';
  const [showRankUp, setShowRankUp] = useState(false);

  const lines = summary
    ? LINES.map((l) => ({ ...l, amount: sum(summary.events.filter((e) => l.reasons.includes(e.reason))) })).filter((l) => l.amount > 0)
    : [];
  const totalDelay = lines.length * STEP_MS;

  if (!summary) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Button label="Back home" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  const { rank } = summary;
  const pending = summary.events.some((e) => e.status === 'pending_review');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.titles}>
          <Text variant="overline" color="inkMuted">
            Workout complete
          </Text>
          <CountUp value={summary.xpGained} prefix="+" variant="display" duration={totalDelay + 300} />
          <Text color="inkMuted">XP earned</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.stats}>
          <Stat label="Duration" value={formatDurationMs(summary.durationMs)} />
          <Stat label="Sets" value={String(summary.setCount)} />
          <Stat label={`Volume (${unit})`} value={formatNumber(unit === 'lb' ? kgToLb(summary.volumeKg) : summary.volumeKg)} />
        </Animated.View>

        <Card style={styles.tally}>
          {lines.map((l, i) => (
            <Animated.View key={l.label} entering={FadeInDown.delay(200 + i * STEP_MS).duration(260)} style={styles.line}>
              <Text color="inkMuted">{l.label}</Text>
              <CountUp value={l.amount} prefix="+" variant="label" delay={200 + i * STEP_MS} duration={400} />
            </Animated.View>
          ))}
          {summary.capped ? (
            <Text variant="caption" color="inkFaint">
              Daily consistency cap reached. Progress XP still counts.
            </Text>
          ) : null}
        </Card>

        <Animated.View entering={FadeInDown.delay(200 + totalDelay).duration(300)}>
          {/* Rank-ups get the full-screen moment once the level animation has played. */}
          <LevelProgress change={rank} delay={300 + totalDelay} onDone={() => rank.rankUp && setShowRankUp(true)} />
        </Animated.View>

        {summary.prs.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300 + totalDelay).duration(300)} style={styles.section}>
            <Text variant="overline" color="inkMuted">
              Personal records
            </Text>
            {summary.prs.map((pr) => (
              <Card key={`${pr.record.exerciseId}-${pr.record.metric}`} style={styles.prCard}>
                <View style={styles.prIcon}>
                  <TrophyIcon color={colors.prInk} size={20} />
                </View>
                <View style={styles.flex}>
                  <Text variant="label">{pr.exerciseName}</Text>
                  <Text variant="caption" color="inkMuted" tabular>
                    {formatMetric(pr.record.metric, pr.previous.value, unit)} → {formatMetric(pr.record.metric, pr.record.value, unit)}
                  </Text>
                </View>
              </Card>
            ))}
          </Animated.View>
        )}

        {summary.unlocks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(380 + totalDelay).duration(300)} style={styles.section}>
            <Text variant="overline" color="inkMuted">
              Benchmarks unlocked
            </Text>
            {summary.unlocks.map((u) => (
              <Card key={`${u.benchmarkId}-${u.tier}`} style={styles.prCard}>
                <View style={[styles.prIcon, { backgroundColor: colors.accentSoft }]}>
                  <FlameIcon color={colors.accentInk} size={20} />
                </View>
                <View style={styles.flex}>
                  <Text variant="label">
                    {u.benchmarkName} · {TIER_LABELS[u.tier]}
                  </Text>
                  {u.status === 'pending_review' ? (
                    <Text variant="caption" color="inkMuted">
                      Pending: repeat this performance to confirm it
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </Animated.View>
        )}

        {pending ? (
          <Text variant="caption" color="inkFaint">
            Some XP is pending because it’s a big jump. It counts for you now and confirms when you match it again.
          </Text>
        ) : null}

        <Button label="Done" size="lg" onPress={() => router.replace('/')} />
      </ScrollView>

      {showRankUp ? <RankUpMoment rank={rank.after.rank} onDone={() => setShowRankUp(false)} /> : null}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text variant="heading" tabular>
        {value}
      </Text>
      <Text variant="caption" color="inkMuted">
        {label}
      </Text>
    </View>
  );
}

const sum = (events: XpEventDraft[]) => events.reduce((s, e) => s + e.amount, 0);

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  titles: { alignItems: 'center', gap: space.xs, paddingTop: space.xl },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: space.xxs },
  tally: { gap: space.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { gap: space.sm },
  prCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  prIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.pr,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: space.xxs },
}));
