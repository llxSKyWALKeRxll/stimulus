import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

type Props = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Floating bottom snackbar — a quiet, auto-dismissing message with an optional
 * action (e.g. Undo). The parent owns the dismiss timer; this is presentational.
 */
export function Snackbar({ visible, message, actionLabel, onAction }: Props) {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}>
      <Animated.View style={[styles.bar, { backgroundColor: c.text }]}>
        <Text variant="bodySmall" weight="medium" style={{ color: c.background, flex: 1 }} numberOfLines={1}>
          {message}
        </Text>
        {actionLabel ? (
          <Pressable onPress={onAction} hitSlop={10}>
            <Text variant="bodySmall" weight="bold" style={{ color: c.accent }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.six },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
