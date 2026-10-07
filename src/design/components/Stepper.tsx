import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { haptics } from '../haptics';
import { colors, hitSize, radii, space, type } from '../tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  /** Unit label under the number, e.g. "kg" or "reps". */
  unit?: string;
  decimals?: number;
  accessibilityLabel?: string;
}

/** − value + control. Tap the number to type a value directly. */
export function Stepper({ value, onChange, step, min = 0, max = 9999, unit, decimals = 1, accessibilityLabel }: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const round = (n: number) => Math.round(n * 10 ** decimals) / 10 ** decimals;
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(decimals);

  const nudge = (dir: 1 | -1) => {
    const next = clamp(round(value + dir * step));
    if (next !== value) {
      haptics.tick();
      onChange(next);
    }
  };

  const commit = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(parsed)) onChange(clamp(round(parsed)));
    setEditing(false);
  };

  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      <StepButton label="−" onPress={() => nudge(-1)} disabled={value <= min} />
      <View style={styles.valueBox}>
        {editing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[type.number, styles.input]}
          />
        ) : (
          <PressableScale
            accessibilityRole="adjustable"
            accessibilityValue={{ now: value, min, max }}
            onPress={() => {
              setDraft(shown);
              setEditing(true);
            }}>
            <Text variant="number" align="center">
              {shown}
            </Text>
          </PressableScale>
        )}
        {unit ? (
          <Text variant="caption" color="inkMuted" align="center">
            {unit}
          </Text>
        ) : null}
      </View>
      <StepButton label="+" onPress={() => nudge(1)} disabled={value >= max} />
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Increase' : 'Decrease'}
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      style={styles.stepButton}>
      <Text variant="title" color="primaryInk">
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  valueBox: {
    minWidth: 72,
    alignItems: 'center',
  },
  input: {
    color: colors.ink,
    textAlign: 'center',
    minWidth: 72,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 0,
  },
  stepButton: {
    width: hitSize,
    height: hitSize,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
