import { View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: Spacing.eight, paddingHorizontal: Spacing.five }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: Radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.backgroundElevated,
          borderWidth: 1,
          borderColor: c.border,
          marginBottom: Spacing.four,
        }}>
        <Icon name={icon} size={28} color={c.textTertiary} />
      </View>
      <Text variant="subheading" align="center">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySmall" tone="tertiary" align="center" style={{ marginTop: Spacing.two, maxWidth: 280 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
