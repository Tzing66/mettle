import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadows, space, type ColorToken } from '../tokens';

export interface CardProps extends ViewProps {
  tone?: ColorToken;
  padded?: boolean;
}

export function Card({ tone = 'surface', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, { backgroundColor: colors[tone] }, padded && styles.padded, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    ...shadows.card,
  },
  padded: {
    padding: space.lg,
  },
});
