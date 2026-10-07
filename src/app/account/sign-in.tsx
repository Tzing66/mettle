import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, KEYBOARD_DONE_ID, Text } from '@/design/components';
import { haptics } from '@/design/haptics';
import { CheckIcon } from '@/design/icons/Icons';
import { colors, motion, radii, space, type } from '@/design/tokens';
import { sendEmailCode, signInWithGoogle, verifyEmailCode } from '@/features/account/auth';

const BENEFITS = ['Back up every workout', 'Keep your rank across phones', 'Friends and weekly leaderboards'];

export default function SignIn() {
  const [busy, setBusy] = useState<'google' | 'send' | 'verify' | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const done = () => {
    haptics.success();
    router.back();
  };

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Couldn’t sign in', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const google = () =>
    run('google', async () => {
      if (await signInWithGoogle()) done();
    });
  const send = () =>
    run('send', async () => {
      await sendEmailCode(email);
      setCodeSent(true);
    });
  const verify = () =>
    run('verify', async () => {
      await verifyEmailCode(email, code);
      done();
    });

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Button label="Not now" variant="ghost" onPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(motion.duration.slow)} style={styles.titles}>
            <Text variant="title">Save your progress</Text>
            <Text color="inkMuted">Mettle works offline without an account. Sign in when you want:</Text>
          </Animated.View>

          <View style={styles.benefits}>
            {BENEFITS.map((b, i) => (
              <Animated.View key={b} entering={FadeInDown.delay(80 + i * 60).duration(motion.duration.slow)} style={styles.benefit}>
                <View style={styles.tick}>
                  <CheckIcon color={colors.accentInk} size={14} />
                </View>
                <Text>{b}</Text>
              </Animated.View>
            ))}
          </View>

          <Button label={busy === 'google' ? 'Opening Google…' : 'Continue with Google'} size="lg" onPress={google} disabled={!!busy} silent />

          <View style={styles.divider}>
            <View style={styles.rule} />
            <Text variant="caption" color="inkFaint">
              or use your email
            </Text>
            <View style={styles.rule} />
          </View>

          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setCodeSent(false);
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
          />

          {codeSent ? (
            <Animated.View entering={FadeIn.duration(motion.duration.base)} style={styles.codeBlock}>
              <Text variant="caption" color="inkMuted">
                We emailed a 6-digit code to {email.trim()}.
              </Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.inkFaint}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_DONE_ID : undefined}
                autoFocus
                style={[styles.input, styles.code]}
              />
              <Button label={busy === 'verify' ? 'Checking…' : 'Sign in'} onPress={verify} disabled={code.length < 6 || !!busy} silent />
              <Button label="Send a new code" variant="ghost" onPress={send} disabled={!!busy} />
            </Animated.View>
          ) : (
            <Button
              label={busy === 'send' ? 'Sending…' : 'Email me a code'}
              variant="secondary"
              onPress={send}
              disabled={!validEmail || !!busy}
            />
          )}

          <Text variant="caption" color="inkFaint" align="center">
            Your workouts sync to your account so you can restore them. Mettle is a training log, not medical advice.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.sm, paddingTop: space.sm },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  titles: { gap: space.sm },
  benefits: { gap: space.sm },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tick: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.line },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  codeBlock: { gap: space.sm },
  code: { ...type.number, letterSpacing: 6, textAlign: 'center' },
});
