import { View } from 'react-native';

import { haptics } from '../haptics';
import { CheckIcon } from '../icons/Icons';
import { radii, space } from '../tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { makeStyles, useTheme } from '../theme';

export interface OptionRowProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

/** Full-width selectable row (radio style). */
export function OptionRow({ label, description, selected, onPress }: OptionRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      style={[styles.row, selected && styles.selected]}>
      <View style={styles.text}>
        <Text variant="heading">{label}</Text>
        {description ? (
          <Text variant="caption" color="inkMuted">
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? <CheckIcon color={colors.onPrimary} size={14} /> : null}
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  selected: {
    borderColor: colors.ink,
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
}));
