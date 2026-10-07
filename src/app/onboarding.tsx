import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createProfile } from '@/db/repositories/profile';
import { Button, OptionRow, PressableScale, ProgressBar, Stepper, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { ChevronLeftIcon } from '@/design/icons/Icons';
import { motion, radii, space, type } from '@/design/tokens';
import { displayWeight, toStoredKg, type UnitPref } from '@/engine';
import { makeStyles, useTheme } from '@/design/theme';

type Sex = 'male' | 'female';

const STEPS = ['name', 'units', 'body', 'birth', 'standards', 'goal'] as const;
const THIS_YEAR = new Date().getFullYear();

export default function Onboarding() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnitPref>('kg');
  const [weightKg, setWeightKg] = useState(75);
  const [birthYear, setBirthYear] = useState(THIS_YEAR - 25);
  const [sex, setSex] = useState<Sex | null>(null);
  const [weeklyDays, setWeeklyDays] = useState(4);

  const key = STEPS[step];
  const canContinue = key === 'name' ? name.trim().length > 0 : key === 'standards' ? sex !== null : true;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (!canContinue) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    createProfile(
      {
        displayName: name.trim(),
        sexForStandards: sex!,
        birthYear,
        unitPref: unit,
        weeklyTargetDays: weeklyDays,
      },
      weightKg,
    );
    haptics.success();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <PressableScale
            accessibilityLabel="Back"
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            style={[styles.back, step === 0 && styles.hidden]}
            disabled={step === 0}>
            <ChevronLeftIcon color={colors.ink} />
          </PressableScale>
          <ProgressBar progress={(step + 1) / STEPS.length} fill={colors.ink} height={4} style={styles.progress} />
        </View>

        <Animated.View
          key={key}
          entering={SlideInRight.duration(motion.duration.slow).withInitialValues({ originX: 40 })}
          exiting={SlideOutLeft.duration(motion.duration.base)}
          style={styles.body}>
          {key === 'name' && (
            <Step title="What should we call you?">
              <TextInput
                keyboardAppearance={scheme}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.inkFaint}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={next}
                style={styles.input}
              />
            </Step>
          )}

          {key === 'units' && (
            <Step title="Kilograms or pounds?" subtitle="You can change this any time.">
              <OptionRow label="Kilograms (kg)" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
              <OptionRow label="Pounds (lb)" selected={unit === 'lb'} onPress={() => setUnit('lb')} />
            </Step>
          )}

          {key === 'body' && (
            <Step title="Your bodyweight" subtitle="Benchmarks compare lifts to your bodyweight, so a 60 kg and a 110 kg lifter are judged fairly.">
              <Field label="Weight">
                <Stepper
                  value={displayWeight(weightKg, unit)}
                  onChange={(v) => setWeightKg(toStoredKg(v, unit))}
                  step={unit === 'kg' ? 0.5 : 1}
                  min={unit === 'kg' ? 30 : 66}
                  max={unit === 'kg' ? 250 : 550}
                  unit={unit}
                />
              </Field>
            </Step>
          )}

          {key === 'birth' && (
            <Step title="Year of birth" subtitle="Running standards adjust for age.">
              <Field label="Born in">
                <Stepper value={birthYear} onChange={setBirthYear} step={1} min={THIS_YEAR - 90} max={THIS_YEAR - 13} decimals={0} />
              </Field>
            </Step>
          )}

          {key === 'standards' && (
            <Step title="Which standards should we compare you to?" subtitle="Strength and running benchmarks are published separately for men and women.">
              <OptionRow label="Male standards" selected={sex === 'male'} onPress={() => setSex('male')} />
              <OptionRow label="Female standards" selected={sex === 'female'} onPress={() => setSex('female')} />
            </Step>
          )}

          {key === 'goal' && (
            <Step title="How many days a week?" subtitle="Hit this to keep your streak. Rest days never break it.">
              <View style={styles.days}>
                {[3, 4, 5, 6].map((d) => (
                  <PressableScale
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: weeklyDays === d }}
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
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Text variant="caption" color="inkMuted" style={styles.disclaimer}>
                  Mettle is a training log, not medical advice. Check with a professional before starting a new programme.
                </Text>
              </Animated.View>
            </Step>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Button label={isLast ? 'Start training' : 'Continue'} size="lg" onPress={next} disabled={!canContinue} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  hidden: { opacity: 0 },
  progress: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl },
  step: { gap: space.xl },
  titles: { gap: space.sm },
  fields: { gap: space.md },
  input: {
    ...type.title,
    color: colors.ink,
    paddingVertical: space.md,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
  },
  field: {
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
  disclaimer: { marginTop: space.lg },
  footer: { padding: space.lg },
}));
