import { startOfDay, startOfWeek, subDays } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SessionCard } from '@/components/session-card';
import { Button, Card, EmptyState, Icon, Screen, SectionLabel, StatTile, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { createWorkoutSession, getProfile, listSessionSummaries, type SessionSummary } from '@/lib/db/queries';
import type { Units } from '@/lib/db/types';
import { formatCompact } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { kgToDisplay } from '@/lib/units';

function currentStreak(days: Set<string>): number {
  let streak = 0;
  let cursor = startOfDay(new Date());
  // Allow the streak to "hold" if today isn't logged yet but yesterday was.
  if (!days.has(cursor.toDateString())) cursor = subDays(cursor, 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export default function Today() {
  const router = useRouter();
  const { c } = useTheme();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [units, setUnits] = useState<Units>('kg');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([listSessionSummaries(40), getProfile()]);
      setSessions(s);
      if (p) setUnits(p.units);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const startWorkout = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const s = await createWorkoutSession();
      router.push(`/workout/${s.id}`);
    } catch (e) {
      console.warn(e);
    } finally {
      setCreating(false);
    }
  };

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeek = sessions.filter((s) => new Date(s.performed_at) >= weekStart);
  const weekVolumeKg = thisWeek.reduce((a, s) => a + s.totalVolumeKg, 0);
  const dayKeys = new Set(sessions.map((s) => new Date(s.performed_at).toDateString()));
  const streak = currentStreak(dayKeys);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.eight }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={c.accent}
          />
        }>
        <View style={{ marginTop: Spacing.five }}>
          <Text variant="label" tone="tertiary">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
          </Text>
          <Text variant="title" style={{ marginTop: Spacing.one }}>
            Today
          </Text>
        </View>

        <Card accent style={{ marginTop: Spacing.five }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Icon name="flame" size={18} color={c.accent} />
            <Text variant="label" tone="secondary">
              {streak > 0 ? `${streak}-DAY STREAK` : 'START YOUR STREAK'}
            </Text>
          </View>
          <Text variant="heading" style={{ marginTop: Spacing.three }}>
            Ready to train?
          </Text>
          <Text variant="bodySmall" tone="secondary" style={{ marginTop: Spacing.one }}>
            Log sets, reps and drop sets — every rep counts toward your progress.
          </Text>
          <View style={{ marginTop: Spacing.four }}>
            <Button title="Start workout" loading={creating} onPress={startWorkout} size="lg" />
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.four }}>
          <SectionLabel>This week</SectionLabel>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StatTile label="Workouts" value={String(thisWeek.length)} />
            <StatTile label="Volume" value={`${formatCompact(kgToDisplay(weekVolumeKg, units))}`} sub={units} />
            <StatTile label="Streak" value={String(streak)} sub={streak === 1 ? 'day' : 'days'} />
          </View>
        </Card>

        <View style={{ marginTop: Spacing.six }}>
          <SectionLabel>Recent</SectionLabel>
          {loading ? (
            <Text variant="bodySmall" tone="tertiary">
              Loading…
            </Text>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon="barbell-outline"
              title="No workouts yet"
              subtitle="Tap “Start workout” to log your first session."
            />
          ) : (
            <View style={{ gap: Spacing.three }}>
              {sessions.slice(0, 5).map((s) => (
                <SessionCard key={s.id} session={s} units={units} onPress={() => router.push(`/workout/${s.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
