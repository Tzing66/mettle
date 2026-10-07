import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '../haptics';
import { hitSize, radii, space, type ColorToken } from '../tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { makeStyles, useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost';
type Size = 'md' | 'lg';

const variantStyles: Record<Variant, { bg: ColorToken | null; fg: ColorToken; border: boolean }> = {
  primary: { bg: 'primary', fg: 'onPrimary', border: false },
  secondary: { bg: 'surface', fg: 'ink', border: true },
  accent: { bg: 'accent', fg: 'onAccent', border: false },
  ghost: { bg: null, fg: 'accentInk', border: false },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  disabled?: boolean;
  /** Skip the default tick when the caller fires its own haptic. */
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, disabled, silent, style }: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const v = variantStyles[variant];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        if (!silent) haptics.tick();
        onPress?.();
      }}
      style={[
        styles.base,
        size === 'lg' && styles.lg,
        v.bg && { backgroundColor: colors[v.bg] },
        v.border && styles.border,
        style,
      ]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant={size === 'lg' ? 'heading' : 'label'} color={v.fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    minHeight: hitSize,
    paddingHorizontal: space.xl,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: {
    minHeight: 58,
    borderRadius: radii.lg,
  },
  border: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  icon: {
    marginRight: space.sm,
  },
}));
