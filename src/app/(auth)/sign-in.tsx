import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Input, Pill, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Channel = 'email' | 'phone';

export default function SignIn() {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>('email');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    channel === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      : /^\+?[1-9]\d{6,14}$/.test(value.replace(/[\s-]/g, ''));

  const onContinue = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    const cleaned = value.trim();
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleaned,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: cleaned.replace(/[\s-]/g, ''),
        });
        if (error) throw error;
      }
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { channel, value: cleaned },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={{ gap: Spacing.three, marginTop: Spacing.four }}>
            <Text variant="title">Sign in</Text>
            <Text variant="body" tone="secondary">
              Enter your email or phone — we&apos;ll text or email a 6-digit code.
            </Text>
          </View>

          <View style={{ marginTop: Spacing.six }}>
            <View style={styles.tabs}>
              <Pill
                label="Email"
                selected={channel === 'email'}
                onPress={() => {
                  setChannel('email');
                  setValue('');
                  setError(null);
                }}
              />
              <Pill
                label="Phone"
                selected={channel === 'phone'}
                onPress={() => {
                  setChannel('phone');
                  setValue('');
                  setError(null);
                }}
              />
            </View>

            <View style={{ marginTop: Spacing.four }}>
              {channel === 'email' ? (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={value}
                  onChangeText={setValue}
                  error={error}
                  autoFocus
                />
              ) : (
                <Input
                  label="Phone"
                  placeholder="+1 555 123 4567"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  value={value}
                  onChangeText={setValue}
                  hint="Include country code."
                  error={error}
                  autoFocus
                />
              )}
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ paddingBottom: Spacing.six }}>
            <Button
              title="Send code"
              size="lg"
              loading={loading}
              disabled={!valid}
              onPress={onContinue}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two },
});
