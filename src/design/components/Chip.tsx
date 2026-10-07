import type { ReactNode } from 'react';
import { View } from 'react-native';

import { fonts, radii, space, type ColorToken } from '../tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { makeStyles, useTheme } from '../theme';

export interface ChipProps {
  label: string;
  tone?: ColorToken;
  textColor?: ColorToken;
  icon?: ReactNode;
  onPress?: () => void;
}

/** Small rounded label. Pressable when onPress is set. */
export function Chip({ label, tone = 'sunken', textColor = 'ink', icon, onPress }: ChipProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const content = (
    <>
      {icon}
      <Text variant="caption" color={textColor} style={styles.text}>
        {label}
      </Text>
    </>
  );
  const style = [styles.chip, { backgroundColor: colors[tone] }];
  return onPress ? (
    <PressableScale accessibilityRole="button" onPress={onPress} style={style}>
      {content}
    </PressableScale>
  ) : (
    <View style={style}>{content}</View>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 1,
    borderRadius: radii.pill,
  },
  text: {
    fontFamily: fonts.semibold,
  },
}));
