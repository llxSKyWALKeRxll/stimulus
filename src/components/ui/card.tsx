import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet, View, ViewProps } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

type Props = (ViewProps | PressableProps) & {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  /** Subtle accent-tinted surface for highlighted cards. */
  accent?: boolean;
};

export function Card({ children, onPress, padded = true, accent = false, style, ...rest }: Props) {
  const { c } = useTheme();
  const base = [
    styles.card,
    padded && styles.padded,
    {
      backgroundColor: accent ? c.accentSoft : c.backgroundElevated,
      borderColor: accent ? c.borderStrong : c.border,
    },
    style as any,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] }]}
        {...(rest as PressableProps)}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} {...(rest as ViewProps)}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  padded: {
    padding: Spacing.five,
  },
});
