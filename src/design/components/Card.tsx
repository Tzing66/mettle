import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, space, type ColorToken } from '../tokens';

export interface CardProps extends ViewProps {
  tone?: ColorToken;
  padded?: boolean;
}

/** Flat surface with a hairline border. */
export function Card({ tone = 'surface', padded = true, style, ...rest }: CardProps) {
  return <View style={[styles.card, { backgroundColor: colors[tone] }, padded && styles.padded, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  padded: {
    padding: space.lg,
  },
});
