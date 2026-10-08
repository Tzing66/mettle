import { useState } from 'react';
import { Image, View } from 'react-native';

import { makeStyles } from '../theme';
import { fonts } from '../tokens';
import { Text } from './Text';

export interface AvatarProps {
  /** Photo URL; initials are shown when null or when it fails to load. */
  uri: string | null;
  name: string;
  size?: number;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
}

/** Round profile photo, or the person's initials. */
export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const styles = useStyles();
  const [failed, setFailed] = useState<string | null>(null);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri && failed !== uri) {
    return <Image source={{ uri }} style={[styles.base, round]} onError={() => setFailed(uri)} accessibilityLabel={`${name}’s photo`} />;
  }
  return (
    <View style={[styles.base, styles.initials, round]} accessibilityLabel={name}>
      <Text color="accentInk" style={{ fontFamily: fonts.bold, fontSize: size * 0.38, lineHeight: size * 0.5 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  base: { backgroundColor: colors.sunken, overflow: 'hidden' },
  initials: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
}));
