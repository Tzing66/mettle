import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { addBodyweight, listBodyweight, updateProfile } from '@/db/repositories/profile';
import { listBenchmarkUnlocks, listLedger, totalXpFromDb } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { Button, Card, RankBadge, Screen, SegmentedTabs, Stepper, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { radii, rankColors, space } from '@/design/tokens';
import {
  benchmarksConfig,
  bodyweightNeedsConfirmation,
  displayWeight,
  rankFor,
  rollingBodyweight,
  toStoredKg,
  type XpReason,
} from '@/engine';
import { formatDay, formatNumber, formatWeight, TIER_LABELS } from '@/features/format';
import { shareWorkoutExport } from '@/features/export/exportData';
import { AccountCard } from '@/features/account/AccountCard';
import { resetTrainingData } from '@/features/profile/resetData';
import { XpLedger } from '@/features/profile/XpLedger';
import { requestSync } from '@/features/sync/useSync';
import { useProfile } from '@/features/profile/useProfile';
import { makeStyles, useTheme, useThemePreference } from '@/design/theme';

const REST_OPTIONS = [
  { key: '0', label: 'Off' },
  { key: '60', label: '1 min' },
  { key: '90', label: '90 s' },
  { key: '120', label: '2 min' },
  { key: '180', label: '3 min' },
];

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
  const themePreference = useThemePreference((p) => p.preference);
  const setThemePreference = useThemePreference((p) => p.setPreference);
  const styles = useStyles();
  const { colors } = useTheme();
  const profile = useProfile();
  const data = useDbQuery(readProfileData, ['bodyweight_logs', 'xp_events', 'benchmark_unlocks']);
  const latest = data.logs[data.logs.length - 1];
  const [draftKg, setDraftKg] = useState(latest?.weightKg ?? 75);
  const [exporting, setExporting] = useState(false);

  if (!profile) return null;
  const unit = profile.unitPref;
  const rank = rankFor(data.totalXp);
  const groupTotals = GROUPS.map((g) => ({
    ...g,
    total: data.ledger.filter((e) => g.reasons.includes(e.reason)).reduce((s, e) => s + e.amount, 0),
  }));
  const maxGroup = Math.max(1, ...groupTotals.map((g) => g.total));

  const confirmReset = () =>
    Alert.alert(
      'Reset all your training data?',
      'This permanently deletes every workout, your XP, records, benchmark unlocks and bodyweight history, on this phone and in your backup. Your account, profile and groups stay. You may want to export your workouts first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: () => {
            resetTrainingData();
            requestSync();
            haptics.success();
            Alert.alert('Data reset', 'You’re starting fresh at E1.');
          },
        },
      ],
    );

  const exportCsv = async () => {
    setExporting(true);
    try {
      await shareWorkoutExport();
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

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

      <AccountCard />

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
          Lifts and reps use Strength Level’s standards (Intermediate = stronger than half of lifters). Runs are age-graded with the WMA 2025 tables.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Settings
        </Text>
        <Setting label="Appearance">
          <SegmentedTabs
            options={[
              { key: 'system', label: 'System' },
              { key: 'light', label: 'Light' },
              { key: 'dark', label: 'Dark' },
            ]}
            value={themePreference}
            onChange={setThemePreference}
          />
        </Setting>
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
        <Setting label="Rest timer">
          <SegmentedTabs
            options={REST_OPTIONS}
            value={String(profile.restSeconds)}
            onChange={(v) => updateProfile({ restSeconds: Number(v) })}
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
        <XpLedger />
      </View>

      <Card style={styles.card}>
        <Text variant="overline" color="inkMuted">
          Your data
        </Text>
        <Text color="inkMuted">Everything lives on this phone. Export every set you’ve logged as a spreadsheet (CSV).</Text>
        <Button label={exporting ? 'Preparing…' : 'Export workouts'} variant="secondary" onPress={exportCsv} disabled={exporting} />
        <Button label="Reset my data" variant="ghost" onPress={confirmReset} />
      </Card>

      <Text variant="caption" color="inkFaint" align="center">
        Mettle is a training log, not medical advice.
      </Text>
    </Screen>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.setting}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
