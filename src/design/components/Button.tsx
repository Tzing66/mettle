import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '../haptics';
import { colors, hitSize, radii, shadows, space, type ColorToken } from '../tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const variantStyles: Record<Variant, { bg: ColorToken | null; fg: ColorToken; border: boolean }> = {
  primary: { bg: 'primary', fg: 'onPrimary', border: false },
  secondary: { bg: 'surface', fg: 'ink', border: true },
  ghost: { bg: null, fg: 'primaryInk', border: false },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  /** Override the background with any colour token (e.g. 'mint' for a success action). */
  tone?: ColorToken;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', tone, icon, disabled, style }: ButtonProps) {
  const v = variantStyles[variant];
  const bg = tone ?? v.bg;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptics.tick();
        onPress?.();
      }}
      style={[
        styles.base,
        size === 'lg' && styles.lg,
        bg && { backgroundColor: colors[bg] },
        v.border && styles.border,
        variant === 'primary' && shadows.card,
        style,
      ]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant={size === 'lg' ? 'heading' : 'label'} color={v.fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitSize,
    paddingHorizontal: space.xl,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: {
    minHeight: 64,
    paddingHorizontal: space.xxl,
  },
  border: {
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  icon: {
    marginRight: space.sm,
  },
});
