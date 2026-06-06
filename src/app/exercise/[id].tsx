import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Card, Icon, Pill, Screen, Segmented, SectionLabel, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import {
  getExercise,
  getExerciseProgress,
  getProfile,
  type ProgressPoint,
} from '@/lib/db/queries';
import type { ExerciseWithTags, Units } from '@/lib/db/types';
import { formatShortDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { formatWeight, kgToDisplay } from '@/lib/units';

type Metric = 'max' | 'est1rm' | 'volume' | 'reps' | 'totalreps';
type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGE_DAYS: Record<Range, number | null> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  ALL: null,
};

type NumericKey = keyof Pick<
  ProgressPoint,
  'max_weight_kg' | 'est_one_rm_kg' | 'total_volume_kg' | 'max_reps' | 'total_reps'
>;

const METRIC_KEY: Record<Metric, NumericKey> = {
  max: 'max_weight_kg',
  est1rm: 'est_one_rm_kg',
  volume: 'total_volume_kg',
  reps: 'max_reps',
  totalreps: 'total_reps',
};

const METRIC_LABEL: Record<Metric, string> = {
  est1rm: 'Est. 1RM',
  max: 'Max weight',
  volume: 'Volume',
  reps: 'Max reps',
  totalreps: 'Total reps',
};

const REP_METRICS = new Set<Metric>(['reps', 'totalreps']);

const METRIC_OPTIONS: Record<'weighted' | 'bodyweight', { label: string; value: Metric }[]> = {
  weighted: [
    { label: 'Est. 1RM', value: 'est1rm' },
    { label: 'Max', value: 'max' },
    { label: 'Reps', value: 'reps' },
    { label: 'Volume', value: 'volume' },
  ],
  bodyweight: [
    { label: 'Max reps', value: 'reps' },
    { label: 'Total reps', value: 'totalreps' },
    { label: 'Volume', value: 'volume' },
  ],
};

export default function ExerciseDetail() {
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<ExerciseWithTags | null>(null);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [units, setUnits] = useState<Units>('kg');
  const [metric, setMetric] = useState<Metric>('est1rm');
  const [range, setRange] = useState<Range>('3M');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getExercise(id), getExerciseProgress(id), getProfile()])
      .then(([ex, pts, p]) => {
        setExercise(ex);
        setProgress(pts);
        if (ex) setMetric(ex.kind === 'bodyweight' ? 'reps' : 'est1rm');
        if (p) setUnits(p.units);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [id]);

  const key = METRIC_KEY[metric];
  const isRep = REP_METRICS.has(metric);
  const toDisplay = (v: number) => (isRep ? v : kgToDisplay(v, units));
  const fmtValue = (v: number) =>
    isRep ? `${Math.round(v)} reps` : formatWeight(v, units, { withUnit: true });

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === null) return progress;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return progress.filter((p) => new Date(p.performed_at).getTime() >= cutoff);
  }, [progress, range]);

  const chartData = useMemo(
    () =>
      filtered.map((p) => ({
        value: isRep ? p[key] : Math.round(kgToDisplay(p[key], units) * 10) / 10,
        label: formatShortDate(p.performed_at),
        labelTextStyle: { color: c.textTertiary, fontSize: 10 },
      })),
    [filtered, key, isRep, units, c.textTertiary],
  );

  const latest = progress[progress.length - 1];
  const previous = progress[progress.length - 2];
  const bests = useMemo(
    () => ({
      maxReps: progress.reduce((m, p) => Math.max(m, p.max_reps), 0),
      est1rm: progress.reduce((m, p) => Math.max(m, p.est_one_rm_kg), 0),
      maxWeight: progress.reduce((m, p) => Math.max(m, p.max_weight_kg), 0),
    }),
    [progress],
  );

  const trend = useMemo(() => {
    if (!latest || !previous) return null;
    const diff = latest[key] - previous[key];
    const pct = previous[key] > 0 ? (diff / previous[key]) * 100 : 0;
    return { diff, pct };
  }, [latest, previous, key]);

  // New PR: latest session beat every prior session on the primary metric.
  const isPR = useMemo(() => {
    if (!exercise || progress.length < 2) return false;
    const k: NumericKey = exercise.kind === 'bodyweight' ? 'max_reps' : 'est_one_rm_kg';
    const last = progress[progress.length - 1][k];
    const priorMax = Math.max(...progress.slice(0, -1).map((p) => p[k]));
    return last > priorMax && last > 0;
  }, [exercise, progress]);

  const width = Dimensions.get('window').width - Spacing.four * 2 - Spacing.five * 2;

  if (loading) {
    return (
      <Screen>
        <Header onBack={() => router.back()} />
        <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.four }}>
          Loading…
        </Text>
      </Screen>
    );
  }

  if (!exercise) {
    return (
      <Screen>
        <Header onBack={() => router.back()} />
        <Text variant="body" tone="secondary" style={{ marginTop: Spacing.four }}>
          Exercise not found.
        </Text>
      </Screen>
    );
  }

  const metricLabel = METRIC_LABEL[metric];

  return (
    <Screen>
      <Header onBack={() => router.back()} onEdit={() => router.push(`/exercise/edit/${exercise.id}`)} />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.eight }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: Spacing.four }}>
          <Text variant="label" tone="tertiary">
            {exercise.kind === 'bodyweight' ? 'BODYWEIGHT' : 'WEIGHTED'}
          </Text>
          <Text variant="title" style={{ marginTop: Spacing.one }}>
            {exercise.name}
          </Text>
          {isPR ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three }}>
              <Icon name="trophy" size={15} color={c.accent} />
              <Text variant="label" tone="accent">
                NEW PERSONAL RECORD
              </Text>
            </View>
          ) : null}
        </View>

        {exercise.tags.length > 0 || exercise.sub_tags.length > 0 ? (
          <View style={styles_tagRow}>
            {exercise.tags.map((t) => (
              <Pill key={t.id} label={t.name} size="sm" />
            ))}
            {exercise.sub_tags.map((st) => (
              <Pill key={st.id} label={st.name} size="sm" />
            ))}
          </View>
        ) : null}

        {exercise.notes ? (
          <Card style={{ marginTop: Spacing.four }}>
            <Text variant="bodySmall" tone="secondary">
              {exercise.notes}
            </Text>
          </Card>
        ) : null}

        {progress.length === 0 ? (
          <Card style={{ marginTop: Spacing.five }} accent>
            <Icon name="trending-up" size={22} color={c.accent} />
            <Text variant="subheading" style={{ marginTop: Spacing.two }}>
              No data yet
            </Text>
            <Text variant="bodySmall" tone="secondary" style={{ marginTop: Spacing.one }}>
              Log a workout with this exercise and your progress will chart here.
            </Text>
          </Card>
        ) : (
          <>
            <View style={{ marginTop: Spacing.five }}>
              <Segmented<Metric> value={metric} onChange={setMetric} options={METRIC_OPTIONS[exercise.kind]} />
            </View>

            <Card style={{ marginTop: Spacing.three, padding: 0, overflow: 'hidden' }}>
              <View style={{ padding: Spacing.five, paddingBottom: 0 }}>
                <Text variant="label" tone="tertiary">
                  {metricLabel.toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three, marginTop: Spacing.two }}>
                  <Text variant="title">{latest ? fmtValue(latest[key]) : '—'}</Text>
                  {trend ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Icon
                        name={trend.diff > 0 ? 'arrow-up' : trend.diff < 0 ? 'arrow-down' : 'remove'}
                        size={14}
                        color={trend.diff > 0 ? c.success : trend.diff < 0 ? c.danger : c.textTertiary}
                      />
                      <Text
                        variant="bodySmall"
                        weight="semibold"
                        style={{ color: trend.diff > 0 ? c.success : trend.diff < 0 ? c.danger : c.textTertiary }}>
                        {Math.abs(Math.round(trend.pct))}%
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={{ paddingHorizontal: Spacing.two, paddingVertical: Spacing.four }}>
                <LineChart
                  data={chartData}
                  width={width - Spacing.two}
                  height={200}
                  initialSpacing={12}
                  spacing={Math.max(28, (width - 48) / Math.max(chartData.length, 1))}
                  thickness={2.5}
                  color={c.accent}
                  startFillColor={c.accent}
                  endFillColor={c.background}
                  startOpacity={0.25}
                  endOpacity={0}
                  areaChart
                  curved
                  dataPointsColor={c.accent}
                  dataPointsRadius={3}
                  hideRules
                  yAxisTextStyle={{ color: c.textTertiary, fontSize: 10 }}
                  yAxisColor="transparent"
                  xAxisColor={c.border}
                  noOfSections={4}
                />
              </View>
            </Card>

            <View style={{ marginTop: Spacing.three }}>
              <Segmented<Range>
                size="sm"
                value={range}
                onChange={setRange}
                options={(['1M', '3M', '6M', '1Y', 'ALL'] as Range[]).map((r) => ({ label: r, value: r }))}
              />
            </View>

            {latest ? (
              <Card style={{ marginTop: Spacing.five }}>
                <SectionLabel>Last session</SectionLabel>
                {exercise.kind === 'bodyweight' ? (
                  <>
                    <Stat
                      label="Top set"
                      value={`${latest.max_reps} reps${latest.max_weight_kg > 0 ? ` (+${formatWeight(latest.max_weight_kg, units, { withUnit: true })})` : ''}`}
                    />
                    <Stat label="Total reps" value={`${latest.total_reps}`} />
                    {latest.total_volume_kg > 0 ? (
                      <Stat label="Added volume" value={formatWeight(latest.total_volume_kg, units, { withUnit: true })} />
                    ) : null}
                    <Stat label="Best set ever" value={`${bests.maxReps} reps`} highlight />
                  </>
                ) : (
                  <>
                    <Stat label="Top set" value={`${formatWeight(latest.max_weight_kg, units, { withUnit: true })} × ${latest.reps_at_max}`} />
                    <Stat label="Est. 1RM" value={formatWeight(latest.est_one_rm_kg, units, { withUnit: true })} />
                    <Stat label="Volume" value={formatWeight(latest.total_volume_kg, units, { withUnit: true })} />
                    <Stat label="Total reps" value={`${latest.total_reps}`} />
                    <Stat label="Best 1RM ever" value={formatWeight(bests.est1rm, units, { withUnit: true })} highlight />
                  </>
                )}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Header({ onBack, onEdit }: { onBack: () => void; onEdit?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={onBack} hitSlop={8} style={{ width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: c.backgroundInteractive, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevron-back" size={20} color={c.text} />
      </Pressable>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={8}>
          <Text variant="bodySmall" tone="accent" weight="semibold">
            Edit
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two }}>
      <Text variant="bodySmall" tone="secondary">
        {label}
      </Text>
      <Text variant="bodySmall" weight="semibold" tone={highlight ? 'accent' : 'primary'}>
        {value}
      </Text>
    </View>
  );
}

const styles_tagRow = {
  marginTop: Spacing.three,
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: Spacing.two,
};
