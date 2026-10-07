import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { addBodyweight, listBodyweight, updateProfile } from '@/db/repositories/profile';
import { listBenchmarkUnlocks, listLedger, totalXpFromDb } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Card, Chip, RankBadge, Screen, SegmentedTabs, Stepper, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { colors, radii, rankColors, space } from '@/design/tokens';
import {
  benchmarksConfig,
  bodyweightNeedsConfirmation,
  displayWeight,
  rankFor,
  rollingBodyweight,
  toStoredKg,
  type XpReason,
} from '@/engine';
import { formatDay, formatNumber, formatWeight, REASON_LABELS, TIER_LABELS } from '@/features/format';
import { useProfile } from '@/features/profile/useProfile';

const GROUPS: { label: string; reasons: XpReason[] }[] = [
  { label: 'Showing up', reasons: ['workout_complete', 'working_sets', 'cardio_minutes', 'streak_bonus', 'weekly_goal'] },
  { label: 'Records & firsts', reasons: ['personal_record', 'first_exercise', 'first_activity'] },
  { label: 'Benchmarks', reasons: ['benchmark_tier'] },
];

function readProfileData() {
  const logs = listBodyweight();
  const ledger = listLedger();
  return {
    totalXp: totalXpFromDb(),
    logs,
    rolling: rollingBodyweight(logs.map((l) => ({ weightKg: l.weightKg, loggedAt: l.loggedAt.getTime() })), Date.now()),
    ledger,
    unlocks: listBenchmarkUnlocks(),
  };
}

export default function Profile() {
  const profile = useProfile();
  const data = useDbQuery(readProfileData, ['bodyweight_logs', 'xp_events', 'benchmark_unlocks']);
  const latest = data.logs[data.logs.length - 1];
  const [draftKg, setDraftKg] = useState(latest?.weightKg ?? 75);

  if (!profile) return null;
  const unit = profile.unitPref;
  const rank = rankFor(data.totalXp);
  const groupTotals = GROUPS.map((g) => ({
    ...g,
    total: data.ledger.filter((e) => g.reasons.includes(e.reason)).reduce((s, e) => s + e.amount, 0),
  }));
  const maxGroup = Math.max(1, ...groupTotals.map((g) => g.total));

  const logWeight = () => {
    const save = () => {
      addBodyweight(draftKg);
      haptics.setComplete();
    };
    const logs = data.logs.map((l) => ({ weightKg: l.weightKg, loggedAt: l.loggedAt.getTime() }));
    if (bodyweightNeedsConfirmation(logs, draftKg, Date.now())) {
      Alert.alert('Big change', `That’s more than 5% different from this week. Log ${formatWeight(draftKg, unit)}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log it', onPress: save },
      ]);
    } else {
      save();
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <RankBadge rank={rank.rank} size={56} />
        <View style={styles.flex}>
          <Text variant="title">{profile.displayName}</Text>
          <Text variant="caption" color="inkMuted" tabular>
            Level {rank.label} · {formatNumber(data.totalXp)} XP
          </Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Bodyweight
        </Text>
        <View style={styles.bwTop}>
          <View>
            <Text variant="number">{data.rolling ? displayWeight(data.rolling, unit) : '–'}</Text>
            <Text variant="caption" color="inkMuted">
              {unit} · 14-day average (used for benchmarks)
            </Text>
          </View>
        </View>
        <View style={styles.bwLog}>
          <Stepper
            value={displayWeight(draftKg, unit)}
            onChange={(v) => setDraftKg(toStoredKg(v, unit))}
            step={unit === 'kg' ? 0.1 : 0.2}
            min={unit === 'kg' ? 30 : 66}
            max={unit === 'kg' ? 250 : 550}
            unit={unit}
          />
          <Button label="Log" onPress={logWeight} silent />
        </View>
        {latest ? (
          <Text variant="caption" color="inkFaint">
            Last logged {formatDay(latest.loggedAt)}: {formatWeight(latest.weightKg, unit)}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Benchmarks
        </Text>
        {benchmarksConfig.benchmarks.map((b) => {
          const mine = data.unlocks.filter((u) => u.benchmarkId === b.id);
          const reached = benchmarksConfig.tiers.filter((t) => mine.some((u) => u.tier === t));
          const top = reached[reached.length - 1];
          const pending = mine.some((u) => u.status === 'pending_review');
          return (
            <View key={b.id} style={styles.benchRow}>
              <View style={styles.flex}>
                <Text variant="label">{b.name}</Text>
                <Text variant="caption" color={top ? 'accentInk' : 'inkFaint'}>
                  {top ? TIER_LABELS[top] : 'Not yet'}
                  {pending ? ' · pending' : ''}
                </Text>
              </View>
              <View style={styles.dots}>
                {benchmarksConfig.tiers.map((t) => (
                  <View key={t} style={[styles.dot, reached.includes(t) && { backgroundColor: colors.accent }]} />
                ))}
              </View>
            </View>
          );
        })}
        <Text variant="caption" color="inkFaint">
          Tiers are placeholders for now and will be replaced with researched standards.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Settings
        </Text>
        <Setting label="Units">
          <SegmentedTabs
            options={[
              { key: 'kg', label: 'kg' },
              { key: 'lb', label: 'lb' },
            ]}
            value={unit}
            onChange={(v) => updateProfile({ unitPref: v })}
          />
        </Setting>
        <Setting label="Days per week">
          <SegmentedTabs
            options={['3', '4', '5', '6'].map((d) => ({ key: d, label: d }))}
            value={String(profile.weeklyTargetDays)}
            onChange={(v) => updateProfile({ weeklyTargetDays: Number(v) })}
          />
        </Setting>
        <Setting label="Standards">
          <SegmentedTabs
            options={[
              { key: 'male', label: 'Male' },
              { key: 'female', label: 'Female' },
            ]}
            value={profile.sexForStandards}
            onChange={(v) => updateProfile({ sexForStandards: v })}
          />
        </Setting>
      </Card>

      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Where your XP came from
        </Text>
        {groupTotals.map((g) => (
          <View key={g.label} style={styles.groupRow}>
            <View style={styles.groupLabel}>
              <Text variant="label">{g.label}</Text>
              <Text variant="label" tabular>
                {formatNumber(g.total)}
              </Text>
            </View>
            <View style={styles.groupTrack}>
              <View style={[styles.groupFill, { width: `${(g.total / maxGroup) * 100}%`, backgroundColor: rankColors[rank.rank] }]} />
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.section}>
        <Text variant="overline" color="inkMuted">
          XP ledger
        </Text>
        <Card padded={false}>
          {data.ledger.length === 0 ? (
            <Text color="inkMuted" style={styles.ledgerEmpty}>
              Nothing yet. Finish a workout to start earning.
            </Text>
          ) : (
            data.ledger.slice(0, 40).map((e, i) => (
              <View key={e.id} style={[styles.ledgerRow, i > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="label">{REASON_LABELS[e.reason]}</Text>
                  <Text variant="caption" color="inkMuted">
                    {formatDay(e.createdAt)}
                  </Text>
                </View>
                {e.status === 'pending_review' ? <Chip label="Pending" tone="xp" textColor="xpInk" /> : null}
                <Text variant="label" tabular>
                  +{formatNumber(e.amount)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </View>

      <Text variant="caption" color="inkFaint" align="center">
        Mettle is a training log, not medical advice.
      </Text>
    </Screen>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.setting}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingTop: space.sm },
  flex: { flex: 1, gap: space.xxs },
  card: { gap: space.md },
  bwTop: { flexDirection: 'row', justifyContent: 'space-between' },
  bwLog: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  benchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dots: { flexDirection: 'row', gap: space.xs },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.sunken },
  setting: { gap: space.sm },
  groupRow: { gap: space.xs },
  groupLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  groupTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.sunken, overflow: 'hidden' },
  groupFill: { height: '100%', borderRadius: radii.pill },
  section: { gap: space.sm },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  ledgerEmpty: { padding: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.line },
});
