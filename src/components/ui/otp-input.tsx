import { forwardRef, useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
  error?: boolean;
};

/**
 * Segmented one-time-code field. The boxes themselves are the input: a single
 * invisible TextInput covers the whole row and captures the digits, while each
 * box renders one character with a caret on the active slot.
 */
export const OtpInput = forwardRef<TextInput, Props>(function OtpInput(
  { value, onChange, length = 6, onComplete, autoFocus, error },
  ref,
) {
  const { c } = useTheme();
  const innerRef = useRef<TextInput>(null);
  const inputRef = (ref as RefObject<TextInput>) ?? innerRef;
  const [focused, setFocused] = useState(false);

  // Blinking caret.
  const [caretOn, setCaretOn] = useState(true);
  useEffect(() => {
    if (!focused) return;
    const t = setInterval(() => setCaretOn((v) => !v), 530);
    return () => clearInterval(t);
  }, [focused]);

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const focus = () => inputRef.current?.focus();

  return (
    <Pressable onPress={focus}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const ch = value[i] ?? '';
          const isActive = focused && i === Math.min(value.length, length - 1);
          const showCaret = isActive && !ch && caretOn;
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  backgroundColor: c.backgroundElevated,
                  borderColor: error
                    ? c.danger
                    : isActive
                    ? c.accent
                    : ch
                    ? c.borderStrong
                    : c.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}>
              {showCaret ? (
                <View style={[styles.caret, { backgroundColor: c.accent }]} />
              ) : (
                <Text variant="heading" weight="bold">
                  {ch}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        maxLength={length}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: { width: 2, height: 26, borderRadius: 1 },
  // Cover the boxes so taps focus it, but invisible.
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
});
