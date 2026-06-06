import { Platform } from 'react-native';

// ── Onyx & Champagne ────────────────────────────────────────────────
// A luxury, watch/spirits-brand palette: warm near-black canvas, a single
// champagne-gold accent, and warm off-white type. Light mode is a warm
// "paper" variant with a deeper gold so the accent keeps contrast on white.

export const Colors = {
  light: {
    background: '#FBFAF7',
    backgroundElevated: '#FFFFFF',
    backgroundInteractive: '#F1ECE2',
    backgroundSelected: '#E7DECD',
    border: '#ECE6DA',
    borderStrong: '#DAD2C2',
    text: '#1A1714',
    textSecondary: '#5C564D',
    textTertiary: '#8C857A',
    textInverse: '#FBFAF7',
    accent: '#9A7B3F',
    accentMuted: '#C9A86A',
    accentSoft: '#F0E7D4',
    accentForeground: '#FFFFFF',
    danger: '#B4452B',
    success: '#4F7942',
    warning: '#B45309',
  },
  dark: {
    background: '#0A0A0A',
    backgroundElevated: '#151310',
    backgroundInteractive: '#211E19',
    backgroundSelected: '#2C2822',
    border: '#211E19',
    borderStrong: '#373129',
    text: '#F2EEE6',
    textSecondary: '#A8A299',
    textTertiary: '#6E6961',
    textInverse: '#0A0A0A',
    accent: '#C9A86A',
    accentMuted: '#8A7448',
    accentSoft: '#211B12',
    accentForeground: '#0A0A0A',
    danger: '#E07A5F',
    success: '#86B17C',
    warning: '#D9A441',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeName = 'light' | 'dark';

// Serif (Playfair Display) is loaded at runtime via @expo-google-fonts in the
// root layout. The family strings below match the exported face names. Body
// copy stays on the crisp platform sans for legibility.
export const Fonts = {
  serif: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
  sans: Platform.select({ ios: 'system-ui', android: 'sans-serif', default: 'normal' })!,
  mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' })!,
};

export const Spacing = {
  px: 1,
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
  '4xl': 44,
  '5xl': 56,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 72 }) ?? 0;
export const MaxContentWidth = 800;
