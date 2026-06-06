import { Pressable, StyleSheet, View } from 'react-native';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

export type SegmentOption<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
};

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: Props<T>) {
  const { c } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: c.backgroundInteractive }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.seg,
              {
                paddingVertical: size === 'sm' ? Spacing.one + 1 : Spacing.two,
                backgroundColor: active ? c.backgroundElevated : 'transparent',
                borderColor: active ? c.borderStrong : 'transparent',
              },
            ]}>
            <Text
              style={{
                color: active ? c.text : c.textTertiary,
                fontSize: size === 'sm' ? FontSize.xs : FontSize.sm,
                fontWeight: active ? FontWeight.semibold : FontWeight.medium,
              }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
});
