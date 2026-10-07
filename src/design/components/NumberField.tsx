import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { colors, radii, space, type } from '../tokens';

export interface NumberFieldProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  decimals?: number;
  width?: number;
  accessibilityLabel: string;
  editable?: boolean;
}

/**
 * Inline number you tap and type into. Commits on blur/submit, so typing
 * "6", "5" doesn't write 6 first. Text is selected on focus for quick overwrite.
 */
export function NumberField({ value, onCommit, decimals = 1, width = 64, accessibilityLabel, editable = true }: NumberFieldProps) {
  const format = (v: number | null) => (v === null ? '' : String(Math.round(v * 10 ** decimals) / 10 ** decimals));
  // Draft text exists only while editing; otherwise the stored value is shown.
  const [draft, setDraft] = useState<string | null>(null);
  const focused = draft !== null;

  const commit = () => {
    if (draft === null) return;
    const parsed = parseFloat(draft.replace(',', '.'));
    const next = Number.isNaN(parsed) ? null : Math.max(0, parsed);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <TextInput
      value={draft ?? format(value)}
      onChangeText={setDraft}
      onFocus={() => setDraft(format(value))}
      onBlur={commit}
      onSubmitEditing={commit}
      editable={editable}
      keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
      returnKeyType="done"
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      placeholder="0"
      placeholderTextColor={colors.inkFaint}
      style={[styles.field, { width }, focused && styles.focused]}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    ...type.label,
    fontVariant: ['tabular-nums'],
    color: colors.ink,
    textAlign: 'center',
    backgroundColor: colors.sunken,
    borderRadius: radii.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  focused: {
    backgroundColor: colors.surface,
    borderColor: colors.ink,
  },
});
