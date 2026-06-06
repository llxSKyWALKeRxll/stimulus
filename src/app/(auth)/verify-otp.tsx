import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

const RESEND_SECONDS = 30;

export default function VerifyOtp() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channel: 'email' | 'phone'; value: string }>();
  const channel = params.channel ?? 'email';
  const target = params.value ?? '';

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

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
      // AuthGate handles redirect.
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
        const { error } = await supabase.auth.signInWithOtp({ email: target });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: target.replace(/[\s-]/g, ''),
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

          <Pressable onPress={() => inputRef.current?.focus()} style={{ marginTop: Spacing.six }}>
            <CodeBoxes value={code} />
            <Input
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 6);
                setCode(digits);
                if (digits.length === 6) void onVerify(digits);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoFocus
              maxLength={6}
              style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
            />
            {error ? (
              <Text variant="caption" tone="danger" style={{ marginTop: Spacing.three }}>
                {error}
              </Text>
            ) : null}
          </Pressable>

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

function CodeBoxes({ value }: { value: string }) {
  return (
    <View style={styles.boxes}>
      {Array.from({ length: 6 }).map((_, i) => {
        const ch = value[i] ?? '';
        const filled = !!ch;
        return <CodeBox key={i} char={ch} filled={filled} />;
      })}
    </View>
  );
}

function CodeBox({ char, filled }: { char: string; filled: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        styles.codeBox,
        {
          backgroundColor: c.backgroundElevated,
          borderColor: filled ? c.accent : c.border,
        },
      ]}>
      <Text variant="heading" weight="bold">
        {char}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  codeBox: {
    width: 48,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
