import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { useTheme } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { c } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}
