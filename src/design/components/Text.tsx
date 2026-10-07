import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type ColorToken, type, type TypeVariant } from '../tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ColorToken;
  /** Fixed-width digits so changing numbers don't jiggle. */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', color = 'ink', tabular, align, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[
        type[variant],
        { color: colors[color] },
        (tabular || variant === 'number') && { fontVariant: ['tabular-nums'] },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
