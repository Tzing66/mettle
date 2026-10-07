// Light/dark theming. Components read colours through hooks so the React
// Compiler sees them as reactive and screens re-render when the theme changes:
//
//   const useStyles = makeStyles((colors) => ({ card: { backgroundColor: colors.surface } }));
//   function Card() { const styles = useStyles(); const { colors } = useTheme(); … }

import { Storage } from 'expo-sqlite/kv-store';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { create } from 'zustand';

import { darkTheme, lightTheme, type Colors, type Theme } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const PREF_KEY = 'theme-preference';

function readPreference(): ThemePreference {
  try {
    const v = Storage.getItemSync(PREF_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const useThemePreference = create<{ preference: ThemePreference; setPreference: (p: ThemePreference) => void }>((set) => ({
  preference: readPreference(),
  setPreference: (preference) => {
    try {
      Storage.setItemSync(PREF_KEY, preference);
    } catch {
      // Not persisted; still applies for this session.
    }
    set({ preference });
  },
}));

/** Which theme applies for a preference and the device setting. */
export function resolveScheme(preference: ThemePreference, system: string | null | undefined): Theme['scheme'] {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const preference = useThemePreference((s) => s.preference);
  const theme = resolveScheme(preference, system) === 'dark' ? darkTheme : lightTheme;

  // Root window colour (behind screens and during transitions) matches the theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {});
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds a themed StyleSheet hook. The factory runs once per theme and is
 * cached, so switching themes is cheap and styles keep a stable identity.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>>(
  factory: (colors: Colors, theme: Theme) => T,
): () => T {
  const cache = new Map<Theme['scheme'], T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme.scheme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme.colors, theme));
      cache.set(theme.scheme, styles);
    }
    return styles;
  };
}
