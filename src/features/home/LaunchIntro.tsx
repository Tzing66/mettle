// The launch moment: once per app start, the rank tiles cascade in, yours
// stays lit, and it fades into Home. About 1.5 s; tap to skip. Skipped when
// the system asks for reduced motion, or when turned off in Profile.
import { Storage } from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { create } from 'zustand';

import { totalXpFromDb } from '@/db/repositories/xp';
import { RankBadge, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { makeStyles } from '@/design/theme';
import { motion, rankInk, space } from '@/design/tokens';
import { rankFor, type RankLetter } from '@/engine';

const RANKS: RankLetter[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const LIGHT_UP_MS = 700;
const DONE_MS = 1600;

// --- Setting (Profile), remembered on this phone ------------------------------

const KEY = 'launch-intro';

function readEnabled(): boolean {
  try {
    return Storage.getItemSync(KEY) !== 'off';
  } catch {
    return true;
  }
}

export const useLaunchIntroSetting = create<{ enabled: boolean; setEnabled: (on: boolean) => void }>((set) => ({
  enabled: readEnabled(),
  setEnabled: (enabled) => {
    try {
      Storage.setItemSync(KEY, enabled ? 'on' : 'off');
    } catch {
      // Not persisted; still applies for this session.
    }
    set({ enabled });
  },
}));

// Once per JS start (a cold launch, or the reload after an update), not on resume.
let played = false;

/** Onboarding has its own welcome; don't greet a brand-new user twice. */
export function skipLaunchIntro() {
  played = true;
}

export function LaunchIntro({ name }: { name: string }) {
  const enabled = useLaunchIntroSetting((s) => s.enabled);
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => !played && enabled && !reduceMotion);

  useEffect(() => {
    played = true;
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), DONE_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return <Intro name={name} onSkip={() => setVisible(false)} />;
}

function Intro({ name, onSkip }: { name: string; onSkip: () => void }) {
  const styles = useStyles();
  const [rank] = useState(() => rankFor(totalXpFromDb()));

  useEffect(() => {
    const t = setTimeout(() => haptics.tick(), LIGHT_UP_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Pressable accessibilityLabel="Skip intro" onPress={onSkip} style={styles.fill}>
        <View style={styles.ladder}>
          {RANKS.map((r, i) => (
            <Tile key={r} rank={r} index={i} mine={r === rank.rank} />
          ))}
        </View>
        <Animated.View entering={FadeInUp.delay(450).duration(450)} style={styles.text}>
          <Text variant="display" align="center">
            Mettle
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(LIGHT_UP_MS + 50).duration(400)} style={styles.text}>
          <Text variant="heading" color="inkMuted" align="center">
            {name ? `Welcome back, ${name}` : 'Welcome back'}
          </Text>
          <Text variant="overline" align="center" style={{ color: rankInk[rank.rank] }}>
            Level {rank.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** One rank tile: pops in, then the others step back while yours grows. */
function Tile({ rank, index, mine }: { rank: RankLetter; index: number; mine: boolean }) {
  const emphasis = useSharedValue(0);
  useEffect(() => {
    emphasis.set(withDelay(LIGHT_UP_MS, mine ? withSpring(1, motion.spring.pop) : withTiming(1, { duration: 300 })));
  }, [emphasis, mine]);
  const style = useAnimatedStyle(() => ({
    opacity: mine ? 1 : 1 - emphasis.get() * 0.7,
    transform: [{ scale: mine ? 1 + emphasis.get() * 0.25 : 1 }],
  }));
  return (
    <Animated.View entering={ZoomIn.delay(index * 70).springify().damping(13).stiffness(220)}>
      <Animated.View style={style}>
        <RankBadge rank={rank} size={44} />
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: { backgroundColor: colors.bg, zIndex: 10 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingHorizontal: space.xl },
  ladder: { flexDirection: 'row', gap: space.sm, alignItems: 'center', height: 64 },
  text: { gap: space.xs },
}));
