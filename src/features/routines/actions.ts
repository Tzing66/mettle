// Starting, sharing and deleting a routine, shared by the list and detail screens.
import { router } from 'expo-router';
import { Alert, Share } from 'react-native';

import { getExercise } from '@/db/repositories/exercises';
import { deleteRoutine, planFromItems, type RoutineRow } from '@/db/repositories/routines';
import { getActiveWorkout } from '@/db/repositories/workouts';
import type { RoutineItem } from '@/db/schema';
import { haptics } from '@/design/haptics';

import { shareMessage, shareRoutine } from './share';

/** Plans the routine and opens it, unless another workout is already open. */
export function startRoutine(items: RoutineItem[]) {
  if (getActiveWorkout()) {
    Alert.alert('You have a workout open', 'Finish or discard it before starting another.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go to it', onPress: () => router.push('/workout/active') },
    ]);
    return;
  }
  haptics.success();
  planFromItems(items);
  router.push('/workout/active');
}

export async function shareRoutineWithCode(routine: RoutineRow) {
  try {
    const code = await shareRoutine(routine);
    const names = routine.items.flatMap((i) => {
      const e = getExercise(i.exerciseId);
      return e ? [e.name] : [];
    });
    await Share.share({ message: shareMessage(routine, code, names) });
  } catch (e) {
    Alert.alert('Couldn’t share', e instanceof Error ? e.message : String(e));
  }
}

export function confirmDeleteRoutine(routine: RoutineRow, onDeleted?: () => void) {
  Alert.alert(`Delete “${routine.name}”?`, 'Workouts you logged with it stay.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        deleteRoutine(routine.id);
        onDeleted?.();
      },
    },
  ]);
}
