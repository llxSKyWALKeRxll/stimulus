import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, hint, error, trailing, leading, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.danger : focused ? c.accent : c.border;

  return (
    <View style={{ marginBottom: Spacing.three }}>
      {label ? (
        <Text variant="label" tone="secondary" style={{ marginBottom: Spacing.one }}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          {
            backgroundColor: c.backgroundElevated,
            borderColor,
          },
        ]}>
        {leading ? <View style={{ marginRight: Spacing.two }}>{leading}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: c.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
            style,
          ]}
          {...rest}
        />
        {trailing ? <View style={{ marginLeft: Spacing.two }}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: Spacing.one }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: Spacing.one }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
});
