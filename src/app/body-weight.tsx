import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Button, Card, EmptyState, Icon, Input, Screen, SectionLabel, Segmented, StatTile, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getProfile, listBodyWeights, logBodyWeight } from '@/lib/db/queries';
import type { BodyWeight, Units } from '@/lib/db/types';
import { formatShortDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { displayToKg, formatWeight, kgToDisplay } from '@/lib/units';

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL';
const RANGE_DAYS: Record<Range, number | null> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, ALL: null };

const parseDay = (d: string) => new Date(`${d}T00:00:00`);

export default function BodyWeightScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const [entries, setEntries] = useState<BodyWeight[]>([]);
  const [units, setUnits] = useState<Units>('kg');
  const [range, setRange] = useState<Range>('3M');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [bw, p] = await Promise.all([listBodyWeights(), getProfile()]);
      setEntries(bw);
      if (p) setUnits(p.units);
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

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === null) return entries;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return entries.filter((e) => parseDay(e.recorded_on).getTime() >= cutoff);
  }, [entries, range]);

  const chartData = useMemo(
    () =>
      filtered.map((e) => ({
        value: Math.round(kgToDisplay(e.weight_kg, units) * 10) / 10,
        label: formatShortDate(parseDay(e.recorded_on).toISOString()),
        labelTextStyle: { color: c.textTertiary, fontSize: 10 },
      })),
    [filtered, units, c.textTertiary],
  );

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const kgs = filtered.map((e) => e.weight_kg);
    const first = kgs[0];
    const last = kgs[kgs.length - 1];
    return {
      latest: last,
      change: last - first,
      min: Math.min(...kgs),
      max: Math.max(...kgs),
    };
  }, [filtered]);

  const log = async () => {
    const v = parseFloat(value);
    if (!v || Number.isNaN(v) || saving) return;
    setSaving(true);
    try {
      await logBodyWeight(displayToKg(v, units));
      setValue('');
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const width = Dimensions.get('window').width - Spacing.four * 2 - Spacing.five * 2;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.backgroundInteractive }]}>
          <Icon name="chevron-back" size={20} color={c.text} />
        </Pressable>
        <Text variant="heading">Body weight</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.eight }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={{ marginTop: Spacing.four }}>
          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder={`Today's weight (${units})`}
                keyboardType="decimal-pad"
                value={value}
                onChangeText={(t) => setValue(t.replace(/[^\d.]/g, ''))}
                leading={<Icon name="scale-outline" size={18} color={c.textTertiary} />}
              />
            </View>
            <Button title="Log" onPress={log} loading={saving} disabled={!value} fullWidth={false} />
          </View>
        </Card>

        {loading ? (
          <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.four }}>
            Loading…
          </Text>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="scale-outline"
            title="No entries yet"
            subtitle="Log your body weight above and your trend will chart here."
          />
        ) : (
          <>
            <View style={{ marginTop: Spacing.five }}>
              <Segmented<Range>
                size="sm"
                value={range}
                onChange={setRange}
                options={(['1M', '3M', '6M', '1Y', 'ALL'] as Range[]).map((r) => ({ label: r, value: r }))}
              />
            </View>

            {stats ? (
              <Card style={{ marginTop: Spacing.three }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <StatTile label="Latest" value={formatWeight(stats.latest, units, { withUnit: true })} />
                  <StatTile
                    label="Change"
                    value={`${stats.change > 0 ? '+' : ''}${formatWeight(stats.change, units)}`}
                    sub={units}
                    tone={stats.change > 0 ? 'danger' : stats.change < 0 ? 'success' : 'primary'}
                  />
                  <StatTile label="Range" value={`${formatWeight(stats.min, units)}–${formatWeight(stats.max, units)}`} sub={units} />
                </View>
              </Card>
            ) : null}

            {chartData.length >= 2 ? (
              <Card style={{ marginTop: Spacing.three, padding: 0, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: Spacing.two, paddingVertical: Spacing.four }}>
                  <LineChart
                    data={chartData}
                    width={width - Spacing.two}
                    height={210}
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
            ) : (
              <Card style={{ marginTop: Spacing.three }}>
                <Text variant="bodySmall" tone="tertiary">
                  Log at least two days in this range to see a trend line.
                </Text>
              </Card>
            )}

            <View style={{ marginTop: Spacing.six }}>
              <SectionLabel>History</SectionLabel>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {[...entries].reverse().slice(0, 30).map((e, i) => (
                  <View
                    key={e.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: Spacing.three,
                      paddingHorizontal: Spacing.five,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: c.border,
                    }}>
                    <Text variant="bodySmall" tone="secondary">
                      {formatShortDate(parseDay(e.recorded_on).toISOString())}
                    </Text>
                    <Text variant="body" weight="semibold">
                      {formatWeight(e.weight_kg, units, { withUnit: true })}
                    </Text>
                  </View>
                ))}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
