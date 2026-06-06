import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors, type ThemeName } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function AuthGate() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="exercise/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="exercise/[id]" />
      <Stack.Screen name="exercise/edit/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="body-weight" />
      <Stack.Screen name="tags" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = (useColorScheme() ?? 'dark') as ThemeName;
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }
  const navThemeWithColors = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: palette.background,
      card: palette.backgroundElevated,
      text: palette.text,
      border: palette.border,
      primary: palette.accent,
    },
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navThemeWithColors}>
          <AuthProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <AuthGate />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
