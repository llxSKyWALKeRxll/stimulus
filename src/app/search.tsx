import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SessionCard } from '@/components/session-card';
import { EmptyState, Icon, Input, Screen, Segmented, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getProfile, listSessionSummaries, type SessionSummary } from '@/lib/db/queries';
import type { Units } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';

type Sort = 'recent' | 'oldest' | 'volume' | 'reps';

export default function Search() {
  const router = useRouter();
  const { c } = useTheme();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [units, setUnits] = useState<Units>('kg');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([listSessionSummaries(500), getProfile()]);
      setSessions(s);
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

  const results = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matched = sessions.filter((s) => {
      if (tokens.length === 0) return true;
      const hay = [s.title ?? '', ...s.exerciseNames, ...s.tagNames].join(' ').toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    const sorted = [...matched];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime();
        case 'volume':
          return b.totalVolumeKg - a.totalVolumeKg;
        case 'reps':
          return b.totalReps - a.totalReps;
        case 'recent':
        default:
          return new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime();
      }
    });
    return sorted;
  }, [sessions, query, sort]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.backgroundInteractive }]}>
          <Icon name="chevron-back" size={20} color={c.text} />
        </Pressable>
        <Text variant="heading">Search</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ marginTop: Spacing.four }}>
        <Input
          placeholder="Workout name, exercise or tag…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          leading={<Icon name="search" size={18} color={c.textTertiary} />}
          trailing={
            query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="close-circle" size={18} color={c.textTertiary} />
              </Pressable>
            ) : undefined
          }
        />
      </View>

      <View style={{ marginBottom: Spacing.four }}>
        <Segmented<Sort>
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { label: 'Recent', value: 'recent' },
            { label: 'Oldest', value: 'oldest' },
            { label: 'Volume', value: 'volume' },
            { label: 'Reps', value: 'reps' },
          ]}
        />
      </View>

      {loading ? (
        <Text variant="bodySmall" tone="tertiary">
          Loading…
        </Text>
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={query.trim() ? 'No matches' : 'No workouts yet'}
          subtitle={
            query.trim()
              ? 'Try an exercise name (e.g. “bench”), a tag (e.g. “chest”), or a workout name.'
              : 'Your logged workouts will be searchable here.'
          }
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(s) => s.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, gap: Spacing.three }}
          ListHeaderComponent={
            <Text variant="caption" tone="tertiary" style={{ marginBottom: Spacing.two }}>
              {results.length} {results.length === 1 ? 'workout' : 'workouts'}
            </Text>
          }
          renderItem={({ item }) => (
            <SessionCard session={item} units={units} onPress={() => router.push(`/workout/${item.id}`)} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
