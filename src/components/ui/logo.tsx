import { useId } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  /** Width in px. Height is derived (logo is ~1.79:1). */
  size?: number;
  /** Solid color override. When omitted a champagne-gold gradient is used. */
  color?: string;
};

// Dumbbell geometry in a 100 x 56 design box (matches the app icon).
const PARTS: [number, number, number, number, number][] = [
  [0, 0, 16, 56, 5], // left outer plate
  [19, 11, 9, 34, 3], // left collar
  [28, 21, 44, 14, 7], // bar
  [72, 11, 9, 34, 3], // right collar
  [84, 0, 16, 56, 5], // right outer plate
];

/** The Stimulus mark — a dumbbell, in the Onyx & Champagne palette. */
export function Logo({ size = 88, color }: Props) {
  const gradId = useId();
  const fill = color ?? `url(#${gradId})`;
  return (
    <Svg width={size} height={size * 0.56} viewBox="0 0 100 56">
      {color ? null : (
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E0C58C" />
            <Stop offset="0.5" stopColor="#C9A86A" />
            <Stop offset="1" stopColor="#A9844E" />
          </LinearGradient>
        </Defs>
      )}
      {PARTS.map(([x, y, w, h, r], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} rx={r} ry={r} fill={fill} />
      ))}
    </Svg>
  );
}
