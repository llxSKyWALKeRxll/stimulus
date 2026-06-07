import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Logo, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={[styles.markBox, { backgroundColor: c.backgroundElevated, borderColor: c.border }]}>
            <Logo size={72} />
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
            title="Log in"
            size="lg"
            onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { mode: 'login' } })}
          />
          <Button
            title="Create an account"
            variant="ghost"
            size="lg"
            onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { mode: 'register' } })}
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
    width: 124,
    height: 124,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
