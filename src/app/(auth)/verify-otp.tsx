import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, OtpInput, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const RESEND_SECONDS = 30;

export default function VerifyOtp() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channel: 'email' | 'phone'; value: string; mode?: 'login' | 'register' }>();
  const channel = params.channel ?? 'email';
  const target = params.value ?? '';
  const shouldCreateUser = params.mode === 'register';

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onVerify = async (token: string) => {
    if (token.length !== 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const args =
        channel === 'email'
          ? { email: target, token, type: 'email' as const }
          : { phone: target.replace(/[\s-]/g, ''), token, type: 'sms' as const };
      const { error } = await supabase.auth.verifyOtp(args);
      if (error) throw error;
      // AuthGate handles redirect (to onboarding or the app).
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code. Try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: target,
          options: { shouldCreateUser },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: target.replace(/[\s-]/g, ''),
          options: { shouldCreateUser },
        });
        if (error) throw error;
      }
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={{ gap: Spacing.three, marginTop: Spacing.four }}>
            <Text variant="title">Enter code</Text>
            <Text variant="body" tone="secondary">
              We sent a 6-digit code to{' '}
              <Text variant="body" weight="semibold">
                {target}
              </Text>
              .
            </Text>
          </View>

          <View style={{ marginTop: Spacing.six }}>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              onComplete={(v) => void onVerify(v)}
              error={!!error}
              autoFocus
            />
            {error ? (
              <Text variant="caption" tone="danger" style={{ marginTop: Spacing.three }}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', marginTop: Spacing.five }}>
            {cooldown > 0 ? (
              <Text variant="bodySmall" tone="tertiary">
                Resend in {cooldown}s
              </Text>
            ) : (
              <Pressable onPress={onResend} disabled={resending}>
                <Text variant="bodySmall" tone="accent">
                  {resending ? 'Sending…' : 'Resend code'}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ paddingBottom: Spacing.six, gap: Spacing.two }}>
            <Button
              title="Verify"
              size="lg"
              loading={verifying}
              disabled={code.length !== 6}
              onPress={() => onVerify(code)}
            />
            <Button title="Use a different address" variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
