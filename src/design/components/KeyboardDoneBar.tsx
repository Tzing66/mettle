import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { space } from '../tokens';
import { Text } from './Text';
import { makeStyles, useTheme } from '../theme';

/** Number fields attach to this so the iOS number pad gets a Done key. */
export const KEYBOARD_DONE_ID = 'mettle-keyboard-done';

/**
 * iOS number and decimal pads have no return key. Render this once (root
 * layout); TextInputs opt in with inputAccessoryViewID={KEYBOARD_DONE_ID}.
 * Android number pads already have a done key, so this renders nothing there.
 */
export function KeyboardDoneBar() {
  const styles = useStyles();
  const { colors } = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID} backgroundColor={colors.sunken}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={() => Keyboard.dismiss()} hitSlop={8} style={styles.done}>
          <Text variant="label" color="accentInk">
            Done
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  done: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
}));
