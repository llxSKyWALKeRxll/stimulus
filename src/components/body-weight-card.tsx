import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Icon, Input, SectionLabel, Sparkline, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { listBodyWeights, logBodyWeight } from '@/lib/db/queries';
import type { BodyWeight, Units } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';
import { displayToKg, formatWeight, kgToDisplay } from '@/lib/units';

export function BodyWeightCard({ units }: { units: Units }) {
  const { c } = useTheme();
  const router = useRouter();
  const [entries, setEntries] = useState<BodyWeight[]>([]);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    listBodyWeights().then(setEntries).catch(console.warn);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const series = entries.map((e) => kgToDisplay(e.weight_kg, units));
  const delta = latest && prev ? kgToDisplay(latest.weight_kg - prev.weight_kg, units) : null;

  const log = async () => {
    const v = parseFloat(value);
    if (!v || Number.isNaN(v) || saving) return;
    setSaving(true);
    try {
      await logBodyWeight(displayToKg(v, units));
      setValue('');
      load();
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel style={{ marginBottom: 0 }}>Body weight</SectionLabel>
        {entries.length > 0 ? (
          <Pressable onPress={() => router.push('/body-weight')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="caption" tone="accent" weight="semibold">
              View graph
            </Text>
            <Icon name="chevron-forward" size={14} color={c.accent} />
          </Pressable>
        ) : null}
      </View>

      {latest ? (
        <Pressable
          onPress={() => router.push('/body-weight')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three }}>
          <View>
            <Text variant="heading">{formatWeight(latest.weight_kg, units, { withUnit: true })}</Text>
            {delta !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                <Icon
                  name={delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'remove'}
                  size={13}
                  color={c.textTertiary}
                />
                <Text variant="caption" tone="tertiary">
                  {Math.abs(Math.round(delta * 10) / 10)} {units} since last
                </Text>
              </View>
            ) : (
              <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                latest entry
              </Text>
            )}
          </View>
          {series.length > 1 ? <Sparkline data={series} width={110} height={40} color={c.accent} /> : null}
        </Pressable>
      ) : (
        <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.three }}>
          Log your body weight to track it over time.
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.four, alignItems: 'flex-start' }}>
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
  );
}
