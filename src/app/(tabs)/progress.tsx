import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { BodyWeightCard } from '@/components/body-weight-card';
import {
  Card,
  EmptyState,
  Icon,
  Pill,
  Screen,
  SectionLabel,
  Segmented,
  Sparkline,
  StatTile,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  getProfile,
  listExerciseProgressSummaries,
  listExercises,
  listTags,
  listWorkoutDays,
  type ExerciseProgressSummary,
  type ProgressPoint,
} from '@/lib/db/queries';
import type { Tag, Units } from '@/lib/db/types';
import { formatCompact } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { formatWeight, kgToDisplay } from '@/lib/units';

type Metric = 'est1rm' | 'max' | 'reps' | 'volume';

const METRIC_KEY: Record<Metric, keyof Pick<ProgressPoint, 'est_one_rm_kg' | 'max_weight_kg' | 'total_volume_kg' | 'max_reps'>> = {
  est1rm: 'est_one_rm_kg',
  max: 'max_weight_kg',
  reps: 'max_reps',
  volume: 'total_volume_kg',
};

export default function Progress() {
  const router = useRouter();
  const { c } = useTheme();
  const [summaries, setSummaries] = useState<ExerciseProgressSummary[]>([]);
  const [workouts, setWorkouts] = useState(0);
  const [units, setUnits] = useState<Units>('kg');
  const [metric, setMetric] = useState<Metric>('est1rm');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Set<string>>>(new Map());
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, p, days, exs, t] = await Promise.all([
        listExerciseProgressSummaries(),
        getProfile(),
        listWorkoutDays(),
        listExercises(),
        listTags(),
      ]);
      setSummaries(s);
      setWorkouts(days.length);
      if (p) setUnits(p.units);
      setTags(t);
      setTagMap(new Map(exs.map((e) => [e.id, new Set(e.tags.map((tag) => tag.id))])));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalVolumeKg = useMemo(
    () => summaries.reduce((a, s) => a + s.points.reduce((b, p) => b + p.total_volume_kg, 0), 0),
    [summaries],
  );

  // Only surface tags that are attached to an exercise that has progress.
  const visibleTags = useMemo(() => {
    const used = new Set<string>();
    summaries.forEach((s) => tagMap.get(s.exercise.id)?.forEach((id) => used.add(id)));
    return tags.filter((t) => used.has(t.id));
  }, [tags, tagMap, summaries]);

  const filtered = useMemo(
    () => (activeTagId ? summaries.filter((s) => tagMap.get(s.exercise.id)?.has(activeTagId)) : summaries),
    [summaries, activeTagId, tagMap],
  );

  // A "new PR" = the most recent session beat every prior session on the
  // exercise's primary metric (reps for bodyweight, est. 1RM otherwise).
  const recentPRs = useMemo(() => {
    const prs: { id: string; name: string; kind: string; value: number; date: string }[] = [];
    for (const s of summaries) {
      const k = s.exercise.kind === 'bodyweight' ? 'max_reps' : 'est_one_rm_kg';
      const pts = s.points;
      if (pts.length < 2) continue;
      const lastVal = pts[pts.length - 1][k];
      const priorMax = Math.max(...pts.slice(0, -1).map((p) => p[k]));
      if (lastVal > priorMax && lastVal > 0) {
        prs.push({
          id: s.exercise.id,
          name: s.exercise.name,
          kind: s.exercise.kind,
          value: lastVal,
          date: pts[pts.length - 1].performed_at,
        });
      }
    }
    return prs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [summaries]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.eight }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: Spacing.five }}>
          <Text variant="title">Progress</Text>
        </View>

        <Card style={{ marginTop: Spacing.five }}>
          <SectionLabel>All time</SectionLabel>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StatTile label="Workouts" value={String(workouts)} />
            <StatTile label="Volume" value={formatCompact(kgToDisplay(totalVolumeKg, units))} sub={units} />
            <StatTile label="Exercises" value={String(summaries.length)} />
          </View>
        </Card>

        <View style={{ marginTop: Spacing.four }}>
          <BodyWeightCard units={units} />
        </View>

        {recentPRs.length > 0 ? (
          <View style={{ marginTop: Spacing.six }}>
            <SectionLabel>Recent PRs</SectionLabel>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {recentPRs.map((pr, i) => (
                <Pressable
                  key={pr.id}
                  onPress={() => router.push(`/exercise/${pr.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.three,
                    paddingVertical: Spacing.four,
                    paddingHorizontal: Spacing.five,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: c.border,
                    backgroundColor: pressed ? c.backgroundInteractive : 'transparent',
                  })}>
                  <Icon name="trophy" size={18} color={c.accent} />
                  <Text variant="body" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                    {pr.name}
                  </Text>
                  <Text variant="body" weight="semibold" tone="accent">
                    {pr.kind === 'bodyweight'
                      ? `${Math.round(pr.value)} reps`
                      : formatWeight(pr.value, units, { withUnit: true })}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}

        <View style={{ marginTop: Spacing.six }}>
          <SectionLabel>Exercise progression</SectionLabel>

          {loading ? (
            <Text variant="bodySmall" tone="tertiary">
              Loading…
            </Text>
          ) : summaries.length === 0 ? (
            <EmptyState
              icon="stats-chart-outline"
              title="No progress yet"
              subtitle="Log workouts with your exercises and your progression will chart itself here."
            />
          ) : (
            <>
              {visibleTags.length > 0 ? (
                <FlatList
                  horizontal
                  data={[{ id: 'all', name: 'All' } as Tag, ...visibleTags]}
                  keyExtractor={(t) => t.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: Spacing.two, paddingBottom: Spacing.three }}
                  renderItem={({ item }) => (
                    <Pill
                      label={item.name}
                      selected={(activeTagId ?? 'all') === item.id}
                      onPress={() => setActiveTagId(item.id === 'all' ? null : item.id)}
                    />
                  )}
                />
              ) : null}

              <View style={{ marginBottom: Spacing.four }}>
                <Segmented<Metric>
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { label: 'Est. 1RM', value: 'est1rm' },
                    { label: 'Max', value: 'max' },
                    { label: 'Reps', value: 'reps' },
                    { label: 'Volume', value: 'volume' },
                  ]}
                />
              </View>

              {filtered.length === 0 ? (
                <Card>
                  <Text variant="bodySmall" tone="tertiary">
                    No tracked exercises with this tag yet.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: Spacing.three }}>
                  {filtered.map((s) => (
                    <ProgressRow
                      key={s.exercise.id}
                      summary={s}
                      metric={metric}
                      units={units}
                      onPress={() => router.push(`/exercise/${s.exercise.id}`)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ProgressRow({
  summary,
  metric,
  units,
  onPress,
}: {
  summary: ExerciseProgressSummary;
  metric: Metric;
  units: Units;
  onPress: () => void;
}) {
  const { c } = useTheme();
  // Bodyweight exercises have no meaningful weight/1RM — show reps instead.
  const effMetric: Metric =
    summary.exercise.kind === 'bodyweight' && (metric === 'est1rm' || metric === 'max')
      ? 'reps'
      : metric;
  const isRep = effMetric === 'reps';
  const key = METRIC_KEY[effMetric];
  const series = summary.points.map((p) => (isRep ? p[key] : kgToDisplay(p[key], units)));
  const latest = summary.points[summary.points.length - 1];
  const prev = summary.points[summary.points.length - 2];
  const latestVal = latest ? latest[key] : 0;
  const prevVal = prev ? prev[key] : 0;
  const pct = prevVal > 0 ? ((latestVal - prevVal) / prevVal) * 100 : null;
  const up = pct !== null && pct > 0.5;
  const down = pct !== null && pct < -0.5;
  const trendColor = up ? c.success : down ? c.danger : c.textTertiary;

  const headline = isRep
    ? `${Math.round(latestVal)} reps`
    : effMetric === 'volume'
    ? `${formatCompact(kgToDisplay(latestVal, units))} ${units}`
    : `${formatWeight(latestVal, units, { withUnit: true })}`;

  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: Spacing.three }}>
          <Text variant="subheading" numberOfLines={1}>
            {summary.exercise.name}
          </Text>
          <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
            {summary.sessionCount} {summary.sessionCount === 1 ? 'session' : 'sessions'}
          </Text>
        </View>
        <Sparkline data={series} width={84} height={34} color={c.accent} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three, marginTop: Spacing.three }}>
        <Text variant="heading">{headline}</Text>
        {pct !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Icon
              name={up ? 'arrow-up' : down ? 'arrow-down' : 'remove'}
              size={14}
              color={trendColor}
            />
            <Text variant="bodySmall" weight="semibold" style={{ color: trendColor }}>
              {Math.abs(pct).toFixed(0)}%
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
