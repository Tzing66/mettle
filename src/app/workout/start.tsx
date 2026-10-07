// Bottom sheet: how do you want to train today?
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listExercises } from '@/db/repositories/exercises';
import { completedSetsForWorkouts, listFinishedWorkouts, planWorkout, repeatWorkout, startWorkout } from '@/db/repositories/workouts';
import { useDbQuery } from '@/db/useDbQuery';
import { PressableScale, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronRightIcon, ListIcon, PlayIcon, RepeatIcon } from '@/design/icons/Icons';
import { motion, radii, space } from '@/design/tokens';
import { formatDay } from '@/features/format';
import { makeStyles, useTheme } from '@/design/theme';

function readLast() {
  const last = listFinishedWorkouts(1)[0];
  if (!last) return null;
  const names = new Map(listExercises().map((e) => [e.id, e.name]));
  const ids = [...new Set(completedSetsForWorkouts([last.id]).map((s) => s.exerciseId))];
  return { id: last.id, endedAt: last.endedAt!, exercises: ids.map((id) => names.get(id) ?? id) };
}

export default function StartSheet() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const last = useDbQuery(readLast, ['workouts']);

  const go = (create: () => string) => {
    haptics.success();
    create();
    router.replace('/workout/active');
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(motion.duration.base)} style={StyleSheet.absoluteFill}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => router.back()} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(26).stiffness(320)}
        style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Text variant="title">How are we training?</Text>

        <Option
          title="Plan it first"
          body="Pick your exercises and sets, then start the clock."
          tone={colors.accentSoft}
          glyph={<ListIcon color={colors.accentInk} />}
          onPress={() => go(planWorkout)}
        />
        <Option
          title="Start now"
          body="Timer starts right away. Add exercises as you go."
          tone={colors.sunken}
          glyph={<PlayIcon color={colors.ink} />}
          onPress={() => go(startWorkout)}
        />
        {last ? (
          <Option
            title={`Repeat ${formatDay(last.endedAt).toLowerCase() === 'today' ? 'today’s' : 'last'} workout`}
            body={last.exercises.slice(0, 4).join(' · ') + (last.exercises.length > 4 ? ` +${last.exercises.length - 4}` : '')}
            tone={colors.xp}
            glyph={<RepeatIcon color={colors.xpInk} />}
            onPress={() => go(() => repeatWorkout(last.id))}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

function Option({ title, body, tone, glyph, onPress }: { title: string; body: string; tone: string; glyph: ReactNode; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.option}>
      <View style={[styles.glyph, { backgroundColor: tone }]}>
        {glyph}
      </View>
      <View style={styles.optionText}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" color="inkMuted" numberOfLines={2}>
          {body}
        </Text>
      </View>
      <ChevronRightIcon color={colors.inkFaint} size={18} />
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg + 6,
    borderTopRightRadius: radii.lg + 6,
    padding: space.lg,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    marginBottom: space.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  glyph: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: space.xxs },
}));
