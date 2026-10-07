// Phase 0 home: a live preview of the design system wired to the real rank engine.
// Phase 1 replaces this with the real Home (rank card, weekly ring, Start Workout).

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ProgressBar, RankBadge, Screen, Stepper, Text, XPFloat } from '@/design/components';
import { haptics } from '@/design/haptics';
import { rankColors, space } from '@/design/tokens';
import { ranksConfig, rankFor } from '@/engine';

export default function HomeScreen() {
  const [xp, setXp] = useState(1850);
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(8);
  const [floats, setFloats] = useState<number[]>([]);
  const rank = rankFor(xp);

  const completeSet = () => {
    haptics.setComplete();
    setXp((v) => v + 5);
    setFloats((f) => [...f, Date.now()]);
  };

  return (
    <Screen>
      <Text variant="title">Mettle</Text>
      <Text color="inkMuted">Design preview: Phase 0</Text>

      <Card style={styles.rankCard}>
        <RankBadge rank={rank.rank} size={80} />
        <View style={styles.rankText}>
          <Text variant="heading">Level {rank.label}</Text>
          <Text variant="caption" color="inkMuted" tabular>
            {rank.totalXp.toLocaleString()} XP · {(rank.nextLevelXp - rank.totalXp).toLocaleString()} to next level
          </Text>
          <ProgressBar progress={rank.levelProgress} fill={rankColors[rank.rank]} style={styles.bar} />
        </View>
      </Card>

      <Card>
        <Text variant="label" color="inkMuted">
          Bench press · Set 1
        </Text>
        <View style={styles.steppers}>
          <Stepper value={weight} onChange={setWeight} step={2.5} unit="kg" accessibilityLabel="Weight" />
          <Stepper value={reps} onChange={setReps} step={1} min={1} decimals={0} unit="reps" accessibilityLabel="Reps" />
        </View>
        <View>
          <Button label="Complete set ✓" variant="accent" onPress={completeSet} />
          {floats.map((id) => (
            <XPFloat key={id} amount={5} onDone={() => setFloats((f) => f.filter((x) => x !== id))} />
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="label" color="inkMuted" style={styles.sectionLabel}>
          Ranks
        </Text>
        <View style={styles.ranks}>
          {ranksConfig.ranks.map((r) => (
            <RankBadge key={r.rank} rank={r.rank} size={44} />
          ))}
        </View>
        <View style={styles.jump}>
          <Button label="+500 XP" variant="secondary" onPress={() => setXp((v) => v + 500)} />
          <Button label="Jump to S" variant="ghost" onPress={() => setXp(100000)} />
        </View>
      </Card>

      <Button label="Start Workout" size="lg" onPress={() => haptics.success()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  rankText: {
    flex: 1,
    gap: space.xs,
  },
  bar: {
    marginTop: space.sm,
  },
  steppers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: space.lg,
  },
  sectionLabel: {
    marginBottom: space.md,
  },
  ranks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jump: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.lg,
  },
});
