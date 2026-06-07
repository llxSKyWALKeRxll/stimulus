import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, Input, Pill, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { accountExists } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';

type Channel = 'email' | 'phone';
type Mode = 'login' | 'register';

// Phone/SMS OTP is off for v1 (no SMS provider yet). Flip to true once Twilio
// (and, for India, DLT) is configured in the Supabase dashboard.
const ENABLE_PHONE_OTP = false;

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const mode: Mode = params.mode === 'register' ? 'register' : 'login';
  const [channel, setChannel] = useState<Channel>('email');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = () => {
    setError(null);
    router.setParams({ mode: mode === 'login' ? 'register' : 'login' });
  };

  const valid =
    channel === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      : /^\+?[1-9]\d{6,14}$/.test(value.replace(/[\s-]/g, ''));

  const onContinue = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    const cleaned = value.trim();
    const phone = cleaned.replace(/[\s-]/g, '');
    const shouldCreateUser = mode === 'register';
    try {
      // Registering: tell the user up front if they already have an account,
      // before we send a code. (Best-effort — if the check fails, fall through.)
      if (mode === 'register') {
        try {
          const exists = await accountExists(
            channel === 'email' ? { email: cleaned } : { phone },
          );
          if (exists) {
            setError('An account already exists for this. Tap “Log in” below instead.');
            setLoading(false);
            return;
          }
        } catch (checkErr) {
          console.warn('account_exists check failed; continuing', checkErr);
        }
      }

      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleaned,
          options: { shouldCreateUser },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: { shouldCreateUser },
        });
        if (error) throw error;
      }
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { channel, value: cleaned, mode },
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      // Logging in with no existing account: Supabase rejects because we
      // didn't allow user creation. Nudge them to register instead.
      if (mode === 'login' && /signups? not allowed|not found|no.*user/i.test(raw)) {
        setError("We couldn't find an account for that. Tap “Create an account” below.");
      } else {
        setError(raw || 'Could not send the code. Try again.');
      }
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
            <Text variant="title">{mode === 'register' ? 'Create your account' : 'Welcome back'}</Text>
            <Text variant="body" tone="secondary">
              {ENABLE_PHONE_OTP
                ? mode === 'register'
                  ? "Enter your email or phone — we'll send a 6-digit code to verify it."
                  : "Enter your email or phone — we'll send a 6-digit code to sign you in."
                : mode === 'register'
                ? "Enter your email — we'll send a 6-digit code to verify it."
                : "Enter your email — we'll send a 6-digit code to sign you in."}
            </Text>
          </View>

          <View style={{ marginTop: Spacing.six }}>
            {ENABLE_PHONE_OTP ? (
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
            ) : null}

            <View style={{ marginTop: ENABLE_PHONE_OTP ? Spacing.four : 0 }}>
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

          <View style={{ paddingBottom: Spacing.six, gap: Spacing.four }}>
            <Button
              title="Send code"
              size="lg"
              loading={loading}
              disabled={!valid}
              onPress={onContinue}
            />
            <Pressable onPress={switchMode} style={styles.switch} hitSlop={8}>
              <Text variant="bodySmall" tone="secondary">
                {mode === 'login' ? 'New to Stimulus? ' : 'Already have an account? '}
                <Text variant="bodySmall" tone="accent" weight="semibold">
                  {mode === 'login' ? 'Create an account' : 'Log in'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two },
  switch: { alignItems: 'center' },
});
