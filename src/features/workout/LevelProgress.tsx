// Animated level progression for the workout summary. Every level gained gets
// its own beat: the bar fills, sparkles burst, the label pops to the new level
// with a congratulations line, then the bar carries on into the next level.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Card, Chip, RankBadge, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { colors, motion, radii, rankColors, space } from '@/design/tokens';
import { levelSteps, rankFor, type RankChange } from '@/engine';
import { formatNumber } from '@/features/format';

const FILL_MS = 650;
export function LevelProgress({ change, delay, onDone }: { change: RankChange; delay: number; onDone?: () => void }) {
  const [steps] = useState(() => levelSteps(change));
  const [step, setStep] = useState(0);
  const [celebrations, setCelebrations] = useState(0);
  const p = useSharedValue(steps[0].from);
  const labelScale = useSharedValue(1);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const current = rankFor(steps[step].levelXp);

  useEffect(() => {
    const s = steps[step];
    const finished = () => {
      if (step + 1 < steps.length) {
        haptics.success();
        setCelebrations((c) => c + 1);
        setStep(step + 1);
      } else {
        onDoneRef.current?.();
      }
    };
    p.set(s.from);
    labelScale.set(step === 0 ? 1 : withSequence(withSpring(1.18, motion.spring.pop), withSpring(1, motion.spring.snappy)));
    p.set(
      withDelay(
        step === 0 ? delay : 280,
        withTiming(s.to, { duration: FILL_MS * Math.max(0.35, s.to - s.from), easing: Easing.out(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(finished);
        }),
      ),
    );
  }, [step, steps, delay, p, labelScale]);

  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));
  const label = useAnimatedStyle(() => ({ transform: [{ scale: labelScale.get() }] }));

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View>
          <Animated.View key={current.rank} entering={step === 0 ? undefined : ZoomIn.springify().damping(12).stiffness(260)}>
            <RankBadge rank={current.rank} size={52} />
          </Animated.View>
          <SparkleBurst key={celebrations} active={celebrations > 0} color={rankColors[current.rank]} />
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Animated.View style={label}>
              <Text variant="heading">Level {current.label}</Text>
            </Animated.View>
            {celebrations > 0 ? (
              <Animated.View key={celebrations} entering={ZoomIn.springify().damping(14).stiffness(300)}>
                <Chip label={celebrations > 1 ? `+${celebrations} levels` : 'Level up'} tone="accentSoft" textColor="accentInk" />
              </Animated.View>
            ) : null}
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: rankColors[current.rank] }, fill]} />
          </View>
          <Text variant="caption" color="inkMuted" tabular>
            {formatNumber(change.after.nextLevelXp - change.after.totalXp)} XP to next level
          </Text>
        </View>
      </View>
      {celebrations > 0 ? (
        <Animated.View key={`msg-${celebrations}`} entering={FadeInDown.duration(motion.duration.slow)} style={styles.message}>
          <Text variant="label">Congratulations! You’re now Level {current.label}.</Text>
          <Text variant="caption" color="inkMuted">
            {step + 1 < steps.length ? 'And still climbing…' : 'Every set got you here.'}
          </Text>
        </Animated.View>
      ) : null}
    </Card>
  );
}

const SPARKS = 12;

/** Small radial burst of dots behind the badge. Remount (via key) to replay. */
function SparkleBurst({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <View pointerEvents="none" style={styles.burst}>
      {Array.from({ length: SPARKS }, (_, i) => (
        <Spark key={i} angle={(i / SPARKS) * Math.PI * 2} color={i % 3 === 0 ? colors.accent : color} distance={38 + (i % 3) * 8} />
      ))}
    </View>
  );
}

function Spark({ angle, color, distance }: { angle: number; color: string; distance: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [
      { translateX: Math.cos(angle) * distance * t.get() },
      { translateY: Math.sin(angle) * distance * t.get() },
      { scale: 1 - t.get() * 0.5 },
    ],
  }));
  return <Animated.View entering={FadeIn.duration(60)} style={[styles.spark, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  text: { flex: 1, gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.sunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  message: { gap: space.xxs, paddingTop: space.xs, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.line },
  burst: { position: 'absolute', left: 26, top: 26, width: 0, height: 0 },
  spark: { position: 'absolute', width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: radii.pill },
});
