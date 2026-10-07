import { View } from 'react-native';

import type { ExerciseCategory } from '@/engine/types';

import { haptics } from '../haptics';
import { StarIcon } from '../icons/Icons';
import { radii, space } from '../tokens';
import { ExerciseGlyph } from './ExerciseGlyph';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { makeStyles, useTheme } from '../theme';

export interface ExerciseTileProps {
  name: string;
  short: string;
  icon?: string | null;
  category: ExerciseCategory;
  favourite?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  width: number;
}

/** Picker tile: tinted block with the movement glyph, name underneath. Long-press to favourite. */
export function ExerciseTile({ name, short, icon, category, favourite, onPress, onLongPress, width }: ExerciseTileProps) {
  const styles = useStyles();
  const { categoryColors } = useTheme();
  const tone = categoryColors[category];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Adds to workout. Long-press to favourite."
      onPress={onPress}
      onLongPress={() => {
        haptics.tick();
        onLongPress?.();
      }}
      delayLongPress={350}
      style={[styles.tile, { width }]}>
      <View style={[styles.code, { backgroundColor: tone.tint }]}>
        <ExerciseGlyph icon={icon} short={short} color={tone.ink} size={Math.round(width * 0.46)} />
        {favourite ? (
          <View style={styles.star}>
            <StarIcon color={tone.ink} size={14} filled />
          </View>
        ) : null}
      </View>
      <Text variant="caption" numberOfLines={2} style={styles.name}>
        {name}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  tile: {
    gap: space.xs,
  },
  code: {
    aspectRatio: 1.15,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    top: space.xs + 2,
    right: space.xs + 2,
  },
  name: {
    color: colors.ink,
    minHeight: 32,
  },
}));
