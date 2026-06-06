import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconRight,
  fullWidth = true,
  disabled,
  onPress,
  style,
  ...rest
}: Props) {
  const { c } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyles: Record<Size, ViewStyle> = {
    sm: { height: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.md },
    md: { height: 48, paddingHorizontal: Spacing.four, borderRadius: Radius.lg },
    lg: { height: 56, paddingHorizontal: Spacing.five, borderRadius: Radius.lg },
  };

  const variantBg: Record<Variant, string> = {
    primary: c.accent,
    secondary: c.backgroundInteractive,
    ghost: 'transparent',
    danger: c.danger,
  };
  const variantFg: Record<Variant, string> = {
    primary: c.accentForeground,
    secondary: c.text,
    ghost: c.accent,
    danger: '#FFFFFF',
  };
  const variantBorder: Record<Variant, string | undefined> = {
    primary: undefined,
    secondary: c.borderStrong,
    ghost: undefined,
    danger: undefined,
  };
  const fontSize = size === 'lg' ? FontSize.md : size === 'sm' ? FontSize.sm : FontSize.base;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={(e) => {
        if (isDisabled) return;
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        {
          backgroundColor: variantBg[variant],
          borderWidth: variantBorder[variant] ? 1 : 0,
          borderColor: variantBorder[variant],
          opacity: isDisabled ? 0.4 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style as ViewStyle,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variantFg[variant]} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={{ marginRight: Spacing.two }}>{icon}</View> : null}
          <Text
            style={{ color: variantFg[variant], fontSize, fontWeight: FontWeight.semibold, letterSpacing: 0.3 }}>
            {title}
          </Text>
          {iconRight ? <View style={{ marginLeft: Spacing.two }}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
