import { Redirect, Tabs } from 'expo-router';

import { haptics } from '@/design/haptics';
import { FriendsIcon, HistoryIcon, HomeIcon, ProfileIcon } from '@/design/icons/TabIcons';
import { fonts } from '@/design/tokens';
import { useProfile } from '@/features/profile/useProfile';
import { useTheme } from '@/design/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const profile = useProfile();
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.tick() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          elevation: 0,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <HistoryIcon color={color} /> }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: ({ color }) => <FriendsIcon color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <ProfileIcon color={color} /> }} />
    </Tabs>
  );
}
