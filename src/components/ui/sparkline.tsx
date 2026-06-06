import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  /** Draw a soft area fill under the line. */
  fill?: boolean;
};

/**
 * Lightweight trend line built on react-native-svg — cheap enough to render
 * dozens at once (e.g. one per exercise in the Progress list).
 */
export function Sparkline({ data, width = 96, height = 32, color, strokeWidth = 2, fill = true }: Props) {
  const { c } = useTheme();
  const stroke = color ?? c.accent;
  const gradId = useId();

  if (!data || data.length === 0) return <Svg width={width} height={height} />;

  const pad = strokeWidth + 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const n = data.length;
  const dx = n > 1 ? (width - pad * 2) / (n - 1) : 0;

  const points = data.map((v, i) => {
    const x = pad + i * dx;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const area =
    n > 1
      ? `${line} L${points[n - 1][0].toFixed(1)} ${height} L${points[0][0].toFixed(1)} ${height} Z`
      : '';

  return (
    <Svg width={width} height={height}>
      {fill && n > 1 ? (
        <>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gradId})`} />
        </>
      ) : null}
      <Path d={line} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
