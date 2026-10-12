// First launch: a welcome, three short questions, an optional account, and a
// reveal of where you start. Signing in to an account that already has a
// profile restores it and skips the questions.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight, SlideOutLeft, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createProfile } from '@/db/repositories/profile';
import { Button, PressableScale, ProgressBar, RankBadge, SegmentedTabs, Stepper, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon } from '@/design/icons/Icons';
import { makeStyles, useTheme } from '@/design/theme';
import { motion, radii, rankInk, space, type } from '@/design/tokens';
import { displayWeight, toStoredKg, type RankLetter, type UnitPref } from '@/engine';
import { accountLabel, useSession } from '@/features/account/auth';
import { cloudConfigured } from '@/features/account/supabase';
import { useProfile } from '@/features/profile/useProfile';
import { useSyncStore } from '@/features/sync/useSync';

type Sex = 'male' | 'female';
type Step = 'welcome' | 'name' | 'you' | 'rhythm' | 'account' | 'reveal';

const RANKS: RankLetter[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const THIS_YEAR = new Date().getFullYear();

export default function Onboarding() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const profile = useProfile();
  // ?preview=1 (Profile → Replay the welcome): walk through it without changing anything.
  const preview = useLocalSearchParams<{ preview?: string }>().preview === '1';
  const { session } = useSession();
  const syncStatus = useSyncStore((s) => s.status);

  const [step, setStep] = useState<Step>('welcome');
  const [restoring, setRestoring] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnitPref>('kg');
  const [weightKg, setWeightKg] = useState(75);
  const [birthYear, setBirthYear] = useState(THIS_YEAR - 25);
  const [sex, setSex] = useState<Sex | null>(null);
  const [weeklyDays, setWeeklyDays] = useState(4);

  // Signed in to an account that already has a profile (pulled by sync): you're back.
  useEffect(() => {
    if (profile && !preview) router.replace('/');
  }, [profile, preview]);

  // After "I already have an account": once the first sync finishes without a
  // profile, this account is new to Mettle, so set it up.
  useEffect(() => {
    if (!restoring || !session || syncStatus === 'syncing') return;
    const t = setTimeout(() => {
      setRestoring(false);
      setName((n) => n || (accountLabel(session).name.split(' ')[0] ?? ''));
      setStep('name');
    }, 600);
    return () => clearTimeout(t);
  }, [restoring, session, syncStatus]);

  const flow: Step[] = ['name', 'you', 'rhythm', ...(cloudConfigured && (!session || preview) ? (['account'] as const) : []), 'reveal'];
  const index = flow.indexOf(step);
  const go = (s: Step) => {
    haptics.tick();
    // Leaving the welcome screen ends a cancelled "I already have an account".
    if (s !== 'welcome') setRestoring(false);
    setStep(s);
  };
  const next = () => go(flow[Math.min(index + 1, flow.length - 1)]);
  const back = () => (index <= 0 ? go('welcome') : go(flow[index - 1]));

  const canContinue = step === 'name' ? name.trim().length > 0 : step === 'you' ? sex !== null : true;
  const firstName = name.trim().split(' ')[0];

  const signIn = (restore: boolean) => {
    haptics.tick();
    if (preview) {
      if (restore) router.back();
      else next();
      return;
    }
    if (restore) setRestoring(true);
    router.push('/account/sign-in');
  };

  const finish = () => {
    if (preview) {
      haptics.success();
      router.back();
      return;
    }
    createProfile({ displayName: name.trim(), sexForStandards: sex!, birthYear, unitPref: unit, weeklyTargetDays: weeklyDays }, weightKg);
    haptics.success();
    router.replace('/');
  };

  if (restoring && session) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.ink} />
        <Text color="inkMuted">Restoring your training…</Text>
      </SafeAreaView>
    );
  }

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.welcome}>
          <View style={styles.ladder}>
            {RANKS.map((r, i) => (
              <Animated.View key={r} entering={ZoomIn.delay(150 + i * 90).springify().damping(13).stiffness(220)}>
                <RankBadge rank={r} size={44} />
              </Animated.View>
            ))}
          </View>
          <Animated.View entering={FadeInUp.delay(750).duration(500)} style={styles.brand}>
            <Text variant="display" align="center">
              Mettle
            </Text>
            <Text variant="heading" color="inkMuted" align="center">
              Show up. Beat your last self. Rank up.
            </Text>
          </Animated.View>
        </View>
        <Animated.View entering={FadeIn.delay(1100).duration(400)} style={styles.footer}>
          <Button label="Get started" size="lg" onPress={() => go('name')} />
          {cloudConfigured ? <Button label="I already have an account" variant="ghost" onPress={() => signIn(true)} /> : null}
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {step === 'reveal' ? null : (
          <View style={styles.header}>
            <PressableScale accessibilityLabel="Back" onPress={back} style={styles.back}>
              <ChevronLeftIcon color={colors.ink} />
            </PressableScale>
            <ProgressBar progress={(index + 1) / flow.length} fill={colors.ink} height={4} style={styles.progress} />
          </View>
        )}

        <Animated.View
          key={step}
          entering={SlideInRight.duration(motion.duration.slow).withInitialValues({ originX: 40 })}
          exiting={SlideOutLeft.duration(motion.duration.base)}
          style={styles.body}>
          {step === 'name' && (
            <StepView title="What should we call you?" subtitle="This is how friends will see you on leaderboards.">
              <TextInput
                keyboardAppearance={scheme}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.inkFaint}
                autoFocus
                autoCapitalize="words"
                maxLength={60}
                returnKeyType="next"
                onSubmitEditing={() => canContinue && next()}
                style={styles.input}
              />
            </StepView>
          )}

          {step === 'you' && (
            <StepView
              title={`Nice to meet you, ${firstName}.`}
              subtitle="A few details so you’re compared fairly: a 60 kg and a 110 kg lifter, or a 25 and a 55 year old runner, aren’t held to the same numbers.">
              <View style={styles.group}>
                <Text variant="label" color="inkMuted">
                  Compare me with
                </Text>
                <View style={styles.days}>
                  {(
                    [
                      ['male', 'Men’s standards'],
                      ['female', 'Women’s standards'],
                    ] as const
                  ).map(([key, label]) => (
                    <PressableScale
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sex === key }}
                      onPress={() => {
                        haptics.tick();
                        setSex(key);
                      }}
                      style={[styles.choice, sex === key && styles.daySelected]}>
                      <Text variant="label" color={sex === key ? 'onPrimary' : 'ink'}>
                        {label}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              </View>
              <Row label="Born in">
                <Stepper value={birthYear} onChange={setBirthYear} step={1} min={THIS_YEAR - 90} max={THIS_YEAR - 13} decimals={0} />
              </Row>
              <Row label="Bodyweight">
                <Stepper
                  value={displayWeight(weightKg, unit)}
                  onChange={(v) => setWeightKg(toStoredKg(v, unit))}
                  step={unit === 'kg' ? 0.5 : 1}
                  min={unit === 'kg' ? 30 : 66}
                  max={unit === 'kg' ? 250 : 550}
                  unit={unit}
                />
              </Row>
              <SegmentedTabs
                options={[
                  { key: 'kg', label: 'Kilograms' },
                  { key: 'lb', label: 'Pounds' },
                ]}
                value={unit}
                onChange={setUnit}
              />
            </StepView>
          )}

          {step === 'rhythm' && (
            <StepView title="How often do you want to train?" subtitle="Your weekly goal. Hit it to build a streak; rest days never break it.">
              <View style={styles.days}>
                {[2, 3, 4, 5, 6].map((d) => (
                  <PressableScale
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: weeklyDays === d }}
                    accessibilityLabel={`${d} days a week`}
                    onPress={() => {
                      haptics.tick();
                      setWeeklyDays(d);
                    }}
                    style={[styles.day, weeklyDays === d && styles.daySelected]}>
                    <Text variant="number" color={weeklyDays === d ? 'onPrimary' : 'ink'}>
                      {d}
                    </Text>
                  </PressableScale>
                ))}
              </View>
              <Text color="inkMuted" align="center">
                {weeklyDays} days a week
              </Text>
            </StepView>
          )}

          {step === 'account' && (
            <StepView title="Keep your progress safe" subtitle="Optional, and you can do it later from Profile.">
              {[
                ['Back up every workout', 'Change phones without losing anything.'],
                ['Train with friends', 'Groups and weekly leaderboards.'],
                ['Share routines', 'Send a plan to a friend with a code.'],
              ].map(([title, body], i) => (
                <Animated.View key={title} entering={FadeInDown.delay(120 + i * 80).duration(300)} style={styles.perk}>
                  <View style={styles.perkDot} />
                  <View style={styles.flex}>
                    <Text variant="label">{title}</Text>
                    <Text variant="caption" color="inkMuted">
                      {body}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </StepView>
          )}

          {step === 'reveal' && <Reveal name={firstName} />}
        </Animated.View>

        <View style={styles.footer}>
          {step === 'account' ? (
            <>
              <Button label="Sign in or create an account" size="lg" onPress={() => signIn(false)} />
              <Button label="Not now" variant="ghost" onPress={next} />
            </>
          ) : step === 'reveal' ? (
            <Animated.View entering={FadeIn.delay(1400).duration(400)}>
              <Button label="Let’s go" size="lg" onPress={finish} />
            </Animated.View>
          ) : (
            <>
              <Button label="Continue" size="lg" onPress={next} disabled={!canContinue} />
              {step === 'rhythm' ? (
                <Text variant="caption" color="inkFaint" align="center">
                  Mettle is a training log, not medical advice. Check with a professional before starting a new programme.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** "You're in": the ladder with you on the first rung. */
function Reveal({ name }: { name: string }) {
  const styles = useStyles();
  return (
    <View style={styles.reveal}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text variant="display">You’re in{name ? `, ${name}` : ''}.</Text>
      </Animated.View>
      <View style={styles.revealLadder}>
        {RANKS.map((r, i) => (
          <Animated.View key={r} entering={FadeInUp.delay(300 + i * 100).springify().damping(16)} style={styles.rung}>
            <RankBadge rank={r} size={i === 0 ? 52 : 40} />
            {i === 0 ? (
              <Animated.View entering={ZoomIn.delay(1000).springify().damping(12)}>
                <Text variant="overline" style={{ color: rankInk.E }}>
                  You · E1
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        ))}
      </View>
      <Animated.View entering={FadeIn.delay(1100).duration(500)} style={styles.revealText}>
        <Text variant="heading">Everyone starts on the first rung.</Text>
        <Text color="inkMuted">
          Your first workout places you. Train the way you normally do and Mettle compares it with real-world standards. Been training a while?
          You could start as high as A1.
        </Text>
        <Text color="inkMuted">After that, every workout, every set near your best and every record moves you up.</Text>
      </Animated.View>
    </View>
  );
}

function StepView({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.step}>
      <View style={styles.titles}>
        <Text variant="title">{title}</Text>
        {subtitle ? <Text color="inkMuted">{subtitle}</Text> : null}
      </View>
      <View style={styles.fields}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md },
  flex: { flex: 1 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xxl, paddingHorizontal: space.xl },
  ladder: { flexDirection: 'row', gap: space.sm },
  brand: { gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl },
  step: { gap: space.xl },
  titles: { gap: space.sm },
  fields: { gap: space.md },
  group: { gap: space.sm },
  input: { ...type.title, color: colors.ink, paddingVertical: space.md, borderBottomWidth: 1.5, borderBottomColor: colors.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  days: { flexDirection: 'row', gap: space.sm },
  day: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  choice: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
  },
  perk: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  perkDot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.accent, marginTop: 4 },
  reveal: { gap: space.xxl },
  revealLadder: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  rung: { alignItems: 'center', gap: space.xs },
  revealText: { gap: space.sm },
  footer: { padding: space.lg, gap: space.sm },
}));
