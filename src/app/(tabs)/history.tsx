import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isFuture,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SessionCard } from '@/components/session-card';
import { Card, Icon, Screen, SectionLabel, Text } from '@/components/ui';
import { FontWeight, Radius, Spacing } from '@/constants/theme';
import {
  getProfile,
  listBodyWeights,
  listSessionSummariesBetween,
  listWorkoutDays,
  type SessionSummary,
} from '@/lib/db/queries';
import type { Units } from '@/lib/db/types';
import { formatDayFull, formatMonthYear } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { formatWeight } from '@/lib/units';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = (Dimensions.get('window').width - Spacing.four * 2 - Spacing.five * 2) / 7;

export default function History() {
  const router = useRouter();
  const { c } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [daySessions, setDaySessions] = useState<SessionSummary[]>([]);
  const [bodyWeights, setBodyWeights] = useState<Map<string, number>>(new Map());
  const [units, setUnits] = useState<Units>('kg');
  const [loadingDay, setLoadingDay] = useState(true);

  const loadDays = useCallback(async () => {
    try {
      const [days, p, bw] = await Promise.all([listWorkoutDays(), getProfile(), listBodyWeights()]);
      setWorkoutDays(new Set(days.map((d) => new Date(d.performed_at).toDateString())));
      if (p) setUnits(p.units);
      setBodyWeights(new Map(bw.map((e) => [e.recorded_on, e.weight_kg])));
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const loadDay = useCallback(async (day: Date) => {
    setLoadingDay(true);
    try {
      const start = startOfDay(day);
      const end = addDays(start, 1);
      const s = await listSessionSummariesBetween(start.toISOString(), end.toISOString());
      setDaySessions(s);
    } catch (e) {
      console.warn(e);
      setDaySessions([]);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDays();
      loadDay(selected);
    }, [loadDays, loadDay, selected]),
  );

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const today = startOfDay(new Date());

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.eight }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: Spacing.five, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title">History</Text>
          <Pressable
            onPress={() => router.push('/search')}
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: c.backgroundInteractive }]}>
            <Icon name="search" size={18} color={c.text} />
          </Pressable>
        </View>

        <Card style={{ marginTop: Spacing.five }}>
          <View style={styles.monthBar}>
            <Text variant="subheading">{formatMonthYear(month)}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.one }}>
              <NavBtn icon="chevron-back" onPress={() => setMonth((m) => addMonths(m, -1))} />
              <NavBtn
                icon="chevron-forward"
                disabled={isSameMonth(month, today) || isFuture(startOfMonth(addMonths(month, 1)))}
                onPress={() => setMonth((m) => addMonths(m, 1))}
              />
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={{ width: CELL, alignItems: 'center' }}>
                <Text variant="caption" tone="tertiary">
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.gridRow}>
            {grid.map((day) => {
              const inMonth = isSameMonth(day, month);
              const has = workoutDays.has(day.toDateString());
              const isSel = isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              const future = isFuture(day) && !isToday;
              return (
                <Pressable
                  key={day.toISOString()}
                  disabled={future}
                  onPress={() => {
                    setSelected(startOfDay(day));
                    loadDay(day);
                  }}
                  style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}>
                  <View
                    style={[
                      styles.dayCell,
                      isSel && { backgroundColor: c.accent },
                      !isSel && isToday && { borderWidth: 1, borderColor: c.borderStrong },
                    ]}>
                    <Text
                      style={{
                        color: isSel
                          ? c.accentForeground
                          : future || !inMonth
                          ? c.textTertiary
                          : c.text,
                        fontSize: 14,
                        fontWeight: isToday ? FontWeight.bold : FontWeight.medium,
                        opacity: inMonth ? 1 : 0.4,
                      }}>
                      {day.getDate()}
                    </Text>
                  </View>
                  {has ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: isSel ? c.accentForeground : c.accent },
                      ]}
                    />
                  ) : (
                    <View style={styles.dot} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <View style={{ marginTop: Spacing.six }}>
          <SectionLabel>{formatDayFull(selected.toISOString())}</SectionLabel>

          {bodyWeights.get(dayKey(selected)) !== undefined ? (
            <Card style={{ marginBottom: Spacing.three }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <Icon name="scale-outline" size={18} color={c.accent} />
                <Text variant="bodySmall" tone="secondary" style={{ flex: 1 }}>
                  Body weight
                </Text>
                <Text variant="body" weight="semibold">
                  {formatWeight(bodyWeights.get(dayKey(selected))!, units, { withUnit: true })}
                </Text>
              </View>
            </Card>
          ) : null}

          {loadingDay ? (
            <Text variant="bodySmall" tone="tertiary">
              Loading…
            </Text>
          ) : daySessions.length === 0 ? (
            <Card>
              <Text variant="bodySmall" tone="tertiary">
                No workouts on this day.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: Spacing.three }}>
              {daySessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  units={units}
                  timeOnly
                  onPress={() => router.push(`/workout/${s.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function NavBtn({ icon, onPress, disabled }: { icon: 'chevron-back' | 'chevron-forward'; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.navBtn, { backgroundColor: c.backgroundInteractive, opacity: disabled ? 0.35 : 1 }]}>
      <Icon name={icon} size={18} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginTop: Spacing.four, marginBottom: Spacing.one },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
});
