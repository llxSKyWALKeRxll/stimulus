import { View } from 'react-native';
import { Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { SessionSummary } from '@/lib/db/queries';
import type { Units } from '@/lib/db/types';
import { formatCompact, formatSessionDate, formatTime } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { kgToDisplay } from '@/lib/units';

type Props = {
  session: SessionSummary;
  units: Units;
  onPress: () => void;
  /** Show only the time (used when grouped under a day header). */
  timeOnly?: boolean;
};

export function SessionCard({ session, units, onPress, timeOnly }: Props) {
  const { c } = useTheme();
  const empty = session.exerciseCount === 0;
  const names = session.exerciseNames.slice(0, 3).join(' · ');
  const more = session.exerciseCount - 3;
  const title = session.title?.trim();
  const dateLine = timeOnly ? formatTime(session.performed_at) : formatSessionDate(session.performed_at);

  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="subheading" numberOfLines={1}>
            {title || dateLine}
          </Text>
          {title ? (
            <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>
              {dateLine}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={18} color={c.textTertiary} />
      </View>

      {empty ? (
        <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.two }}>
          Empty workout — no exercises logged.
        </Text>
      ) : (
        <>
          <Text variant="bodySmall" tone="secondary" style={{ marginTop: Spacing.two }} numberOfLines={1}>
            {names}
            {more > 0 ? `  +${more} more` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three, columnGap: Spacing.five, marginTop: Spacing.four }}>
            <Metric label="Exercises" value={String(session.exerciseCount)} />
            <Metric label="Sets" value={String(session.setCount)} />
            <Metric label="Reps" value={String(session.totalReps)} />
            {session.totalVolumeKg > 0 ? (
              <Metric label="Volume" value={`${formatCompact(kgToDisplay(session.totalVolumeKg, units))} ${units}`} />
            ) : null}
          </View>
        </>
      )}

      {session.notes ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: Spacing.three }} numberOfLines={2}>
          {session.notes}
        </Text>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="label" tone="tertiary" style={{ fontSize: 10 }}>
        {label.toUpperCase()}
      </Text>
      <Text variant="body" weight="semibold">
        {value}
      </Text>
    </View>
  );
}
