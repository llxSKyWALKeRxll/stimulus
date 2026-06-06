import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontWeight } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IoniconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size ?? 22} color={color as string} />
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.border,
          borderTopWidth: 1,
          // Add the system nav-bar inset (Android edge-to-edge / iOS home indicator)
          // so labels never collide with the nav bar.
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: FontWeight.semibold, letterSpacing: 0.2 },
        tabBarItemStyle: { paddingTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises', tabBarIcon: icon('barbell-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
