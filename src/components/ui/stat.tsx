import { TextStyle, View, ViewStyle } from 'react-native';
import { Spacing } from '@/constants/theme';
import { Text } from './text';

type Tone = 'primary' | 'success' | 'danger' | 'accent';

/** A labelled metric: small uppercase caption over a prominent value. */
export function StatTile({
  label,
  value,
  sub,
  tone = 'primary',
  align = 'left',
  style,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  align?: 'left' | 'center';
  style?: ViewStyle;
}) {
  return (
    <View style={[{ alignItems: align === 'center' ? 'center' : 'flex-start', gap: 3 }, style]}>
      <Text variant="label" tone="tertiary">
        {label.toUpperCase()}
      </Text>
      <Text variant="heading" tone={tone === 'primary' ? 'primary' : tone}>
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" tone="tertiary">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Small uppercase section label used above lists/sections. */
export function SectionLabel({ children, style }: { children: string; style?: TextStyle }) {
  return (
    <Text variant="label" tone="tertiary" style={[{ marginBottom: Spacing.three }, style]}>
      {children.toUpperCase()}
    </Text>
  );
}
