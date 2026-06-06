import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { FontSize, FontWeight, Fonts } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'mono';

type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'inverse';

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: keyof typeof FontWeight;
  align?: 'left' | 'center' | 'right';
};

// Display / title / heading use the Playfair serif; everything else uses the
// platform sans. Serif faces carry their own weight, so we don't set fontWeight
// on them (it would trigger faux-bold on Android).
const variantStyle = StyleSheet.create({
  display: { fontFamily: Fonts.serifBold, fontSize: FontSize['4xl'], letterSpacing: -0.5, lineHeight: FontSize['4xl'] * 1.05 },
  title: { fontFamily: Fonts.serifBold, fontSize: FontSize['3xl'], letterSpacing: -0.3, lineHeight: FontSize['3xl'] * 1.08 },
  heading: { fontFamily: Fonts.serifBold, fontSize: FontSize['2xl'], letterSpacing: -0.2, lineHeight: FontSize['2xl'] * 1.12 },
  subheading: { fontFamily: Fonts.serif, fontSize: FontSize.xl, lineHeight: FontSize.xl * 1.2 },
  body: { fontSize: FontSize.md, fontWeight: FontWeight.regular, lineHeight: FontSize.md * 1.45 },
  bodySmall: { fontSize: FontSize.sm, fontWeight: FontWeight.regular, lineHeight: FontSize.sm * 1.45 },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 1.2 },
  caption: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  mono: { fontSize: FontSize.md, fontFamily: Fonts.mono },
});

const SERIF_VARIANTS = new Set(['display', 'title', 'heading', 'subheading']);

export function Text({
  variant = 'body',
  tone = 'primary',
  weight,
  align,
  style,
  children,
  ...rest
}: Props) {
  const { c } = useTheme();
  const color = {
    primary: c.text,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    accent: c.accent,
    danger: c.danger,
    success: c.success,
    inverse: c.textInverse,
  }[tone];
  // Don't let an explicit weight override serif faces (avoids faux-bold).
  const allowWeight = weight && !SERIF_VARIANTS.has(variant);
  return (
    <RNText
      style={[
        variantStyle[variant],
        { color },
        allowWeight ? { fontWeight: FontWeight[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}>
      {children}
    </RNText>
  );
}
