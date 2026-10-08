// Log a workout that already happened: pick the day, start time and length,
// then fill in exercises and sets on the normal planning screen.
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getActiveWorkout, pastWorkoutFloor, planPastWorkout } from '@/db/repositories/workouts';
import { Button, Chip, PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { makeStyles } from '@/design/theme';
import { radii, space } from '@/design/tokens';
import { formatDay } from '@/features/format';
import { useProfile } from '@/features/profile/useProfile';
import { useWorkoutUi } from '@/features/workout/store';

const MAX_DAYS = 60;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export default function PastWorkout() {
  const styles = useStyles();
  const profile = useProfile();
  const setPast = useWorkoutUi((s) => s.setPast);
  const [now] = useState(() => Date.now());
  const [floor] = useState(() => (profile ? pastWorkoutFloor(profile.createdAt).getTime() : startOfDay(now)));

  const days: number[] = [];
  for (let d = startOfDay(now); d >= floor && days.length < MAX_DAYS; d = startOfDay(d - 12 * 3600_000)) days.push(d);

  const [day, setDay] = useState(() => days[Math.min(1, days.length - 1)]);
  // Default: 18:00, or an hour ago when today is the only day allowed.
  const [startMin, setStartMin] = useState(() =>
    days.length > 1 ? 18 * 60 : Math.max(0, Math.floor(((now - days[0]) / 60_000 - 60) / 15) * 15),
  );
  const [durationMin, setDurationMin] = useState(60);

  const startedAt = day + startMin * 60_000;
  const endsInFuture = startedAt + durationMin * 60_000 > now;

  const step = (set: (f: (v: number) => number) => void, by: number, min: number, max: number) => {
    haptics.tick();
    set((v) => Math.min(max, Math.max(min, v + by)));
  };

  const next = () => {
    if (endsInFuture) return;
    if (getActiveWorkout()) {
      router.replace('/workout/active');
      return;
    }
    haptics.success();
    const id = planPastWorkout(new Date(startedAt));
    setPast({ workoutId: id, durationMin });
    router.replace('/workout/active');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="title">Log a past workout</Text>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text color="inkMuted">
          Forgot to log a session? Add it here. It counts like any other workout. You can go back as far as the day you joined.
        </Text>

        <View style={styles.section}>
          <Text variant="overline" color="inkMuted">
            Day
          </Text>
          <View style={styles.days}>
            {days.map((d) => (
              <Chip
                key={d}
                label={formatDay(new Date(d))}
                tone={d === day ? 'accent' : 'sunken'}
                textColor={d === day ? 'onAccent' : 'ink'}
                onPress={() => {
                  haptics.tick();
                  setDay(d);
                }}
              />
            ))}
          </View>
        </View>

        <Stepper
          label="Started at"
          value={formatClock(startMin)}
          onMinus={() => step(setStartMin, -15, 0, 24 * 60 - 15)}
          onPlus={() => step(setStartMin, 15, 0, 24 * 60 - 15)}
        />
        <Stepper
          label="Lasted"
          value={`${durationMin} min`}
          onMinus={() => step(setDurationMin, -5, 5, 300)}
          onPlus={() => step(setDurationMin, 5, 5, 300)}
        />

        {endsInFuture ? (
          <Text variant="caption" color="prInk">
            That ends in the future. Pick an earlier time.
          </Text>
        ) : null}

        <Button label="Next: add exercises" size="lg" onPress={next} disabled={endsInFuture} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.stepper}>
      <Text variant="overline" color="inkMuted" style={styles.stepperLabel}>
        {label}
      </Text>
      <PressableScale accessibilityLabel={`${label} earlier`} onPress={onMinus} style={styles.stepButton}>
        <Text variant="heading">−</Text>
      </PressableScale>
      <Text variant="heading" tabular style={styles.stepValue}>
        {value}
      </Text>
      <PressableScale accessibilityLabel={`${label} later`} onPress={onPlus} style={styles.stepButton}>
        <Text variant="heading">+</Text>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.sm },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  section: { gap: space.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepperLabel: { flex: 1 },
  stepButton: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 84, textAlign: 'center' },
}));
