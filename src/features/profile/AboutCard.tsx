// Name, about me and goals. Saved when a field loses focus; synced like the rest of the profile.
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { updateProfile } from '@/db/repositories/profile';
import { Card, Text } from '@/design/components';
import { makeStyles, useTheme } from '@/design/theme';
import { radii, space, type } from '@/design/tokens';

import { useProfile } from './useProfile';

const MAX = 300;

export function AboutCard() {
  const styles = useStyles();
  const profile = useProfile();
  if (!profile) return null;
  return (
    <Card style={styles.card}>
      <Text variant="overline" color="inkMuted">
        About you
      </Text>
      <Field
        label="Name"
        value={profile.displayName}
        maxLength={60}
        onSave={(v) => v && updateProfile({ displayName: v })}
      />
      <Field
        label="About me"
        placeholder="e.g. Powerlifting on weekdays, football on Sundays."
        value={profile.about ?? ''}
        multiline
        onSave={(v) => updateProfile({ about: v || null })}
      />
      <Field
        label="Goals"
        placeholder="e.g. Bench 100 kg by March. Run a sub-25 5k."
        value={profile.goals ?? ''}
        multiline
        onSave={(v) => updateProfile({ goals: v || null })}
      />
      <Text variant="caption" color="inkFaint">
        People in your groups can see your photo, name, about me and goals.
      </Text>
    </Card>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  onSave: (value: string) => void;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  // Edit a draft while focused; the stored value shows otherwise.
  const [draft, setDraft] = useState<string | null>(null);
  const save = () => {
    if (draft !== null && draft.trim() !== props.value) props.onSave(draft.trim());
    setDraft(null);
  };
  return (
    <View style={styles.field}>
      <Text variant="label" color="inkMuted">
        {props.label}
      </Text>
      <TextInput
        keyboardAppearance={scheme}
        value={draft ?? props.value}
        onFocus={() => setDraft(props.value)}
        onChangeText={setDraft}
        onBlur={save}
        placeholder={props.placeholder}
        placeholderTextColor={colors.inkFaint}
        multiline={props.multiline}
        maxLength={props.maxLength ?? MAX}
        autoCapitalize="sentences"
        style={[styles.input, props.multiline && styles.multiline]}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { gap: space.md },
  field: { gap: space.xs },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
}));
