import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

type Props = ViewProps & {
  children: ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function Screen({ children, scrollable, padded = true, edges, style, ...rest }: Props) {
  const { c } = useTheme();
  const containerStyle = [
    { flex: 1, backgroundColor: c.background },
    padded && styles.padded,
    style,
  ];

  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[{ flexGrow: 1 }, padded && styles.padded]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={containerStyle as any} {...rest}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges ?? ['top', 'bottom']} style={{ flex: 1, backgroundColor: c.background }}>
      {scrollable ? <View style={{ flex: 1 }}>{inner}</View> : inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  padded: {
    paddingHorizontal: Spacing.four,
  },
});
