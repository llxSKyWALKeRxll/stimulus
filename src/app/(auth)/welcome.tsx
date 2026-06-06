import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={[styles.markBox, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.accentForeground, fontSize: 36, fontWeight: '800' }}>
              S
            </Text>
          </View>
          <Text variant="display" style={{ marginTop: Spacing.five }}>
            Stimulus
          </Text>
          <Text variant="subheading" tone="secondary" align="center" style={{ marginTop: Spacing.three }}>
            Track every set, rep, and drop. Watch yourself get stronger.
          </Text>
        </View>

        <View style={{ gap: Spacing.three, paddingBottom: Spacing.six }}>
          <Button
            title="Continue"
            size="lg"
            onPress={() => router.push('/(auth)/sign-in')}
          />
          <Text variant="caption" tone="tertiary" align="center">
            We&apos;ll send a one-time code. No passwords.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.seven,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  markBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
