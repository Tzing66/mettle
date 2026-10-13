// A small confirmation that slides down from the top ("Routine saved · View").
// Call showToast() from anywhere; <ToastHost /> lives once in the root layout.
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { haptics } from '../haptics';
import { CheckIcon } from '../icons/Icons';
import { makeStyles, useTheme } from '../theme';
import { radii, space } from '../tokens';
import { Text } from './Text';

export interface ToastMessage {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

const useToastStore = create<{ toast: (ToastMessage & { id: number }) | null }>(() => ({ toast: null }));

const VISIBLE_MS = 3200;

export function showToast(message: ToastMessage) {
  haptics.success();
  useToastStore.setState({ toast: { ...message, id: Date.now() } });
}

function hide(id: number) {
  if (useToastStore.getState().toast?.id === id) useToastStore.setState({ toast: null });
}

export function ToastHost() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => hide(toast.id), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.sm }]}>
      <Animated.View key={toast.id} entering={SlideInUp.springify().damping(18).stiffness(220)} exiting={SlideOutUp.duration(200)}>
        <Pressable accessibilityRole="alert" accessibilityLabel={`${toast.title}. ${toast.body ?? ''}`} onPress={() => hide(toast.id)} style={styles.card}>
          <Animated.View entering={ZoomIn.delay(150).springify().damping(10)} style={styles.check}>
            <CheckIcon color={colors.onAccent} size={16} />
          </Animated.View>
          <View style={styles.text}>
            <Text variant="label">{toast.title}</Text>
            {toast.body ? (
              <Text variant="caption" color="inkMuted" numberOfLines={1}>
                {toast.body}
              </Text>
            ) : null}
          </View>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                hide(toast.id);
                toast.action!.onPress();
              }}
              style={styles.action}>
              <Text variant="label" color="accentInk">
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  host: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  check: { width: 28, height: 28, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  action: { paddingHorizontal: space.sm, paddingVertical: space.xs },
}));
