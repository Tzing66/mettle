// Fire-and-forget haptics. Never awaited, so they can't delay the UI.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function fire(promise: () => Promise<void>) {
  if (!enabled) return;
  promise().catch(() => {});
}

export const haptics = {
  /** Steppers, toggles, tab changes. */
  tick: () => fire(() => Haptics.selectionAsync()),
  /** A completed set. */
  setComplete: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A personal record. */
  pr: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** Level-ups, rank-ups, finishing a workout. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
