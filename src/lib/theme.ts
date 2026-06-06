import { useColorScheme } from 'react-native';
import { Colors, ThemeName } from '@/constants/theme';

export function useTheme() {
  const scheme = (useColorScheme() ?? 'dark') as ThemeName;
  return { name: scheme, c: Colors[scheme] };
}

export type Theme = ReturnType<typeof useTheme>;
