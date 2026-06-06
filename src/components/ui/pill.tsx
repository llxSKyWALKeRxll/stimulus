import { Pressable, StyleSheet, View, ViewProps } from 'react-native';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
} & Pick<ViewProps, 'style'>;

export function Pill({ label, selected, onPress, size = 'md', style }: Props) {
  const { c } = useTheme();
  const bg = selected ? c.accent : c.backgroundInteractive;
  const fg = selected ? c.accentForeground : c.textSecondary;
  const borderColor = selected ? c.accent : c.border;

  const content = (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor,
          paddingVertical: size === 'sm' ? Spacing.one : Spacing.two - 1,
          paddingHorizontal: size === 'sm' ? Spacing.three : Spacing.four,
        },
        style as any,
      ]}>
      <Text
        style={{
          color: fg,
          fontSize: size === 'sm' ? FontSize.xs : FontSize.sm,
          fontWeight: FontWeight.semibold,
        }}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
