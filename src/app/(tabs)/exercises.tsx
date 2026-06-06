import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Card, EmptyState, Icon, Input, Pill, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { listExercises, listSubTags, listTags } from '@/lib/db/queries';
import type { ExerciseWithTags, SubTag, Tag } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';

export default function Exercises() {
  const router = useRouter();
  const { c } = useTheme();
  const [exercises, setExercises] = useState<ExerciseWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTags, setSubTags] = useState<SubTag[]>([]);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [activeSubTagId, setActiveSubTagId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ex, t, st] = await Promise.all([listExercises(), listTags(), listSubTags()]);
      setExercises(ex);
      setTags(t);
      setSubTags(st);
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

  const filteredSubTags = useMemo(
    () => (activeTagId ? subTags.filter((st) => st.parent_tag_id === activeTagId) : []),
    [subTags, activeTagId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (activeTagId && !e.tags.some((t) => t.id === activeTagId)) return false;
      if (activeSubTagId && !e.sub_tags.some((st) => st.id === activeSubTagId)) return false;
      return true;
    });
  }, [exercises, query, activeTagId, activeSubTagId]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text variant="title">Exercises</Text>
        <Pressable onPress={() => router.push('/tags')} hitSlop={8} style={styles.manage}>
          <Icon name="pricetags-outline" size={15} color={c.accent} />
          <Text variant="bodySmall" tone="accent" weight="semibold">
            Tags
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: Spacing.four }}>
        <Input
          placeholder="Search exercises…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          leading={<Icon name="search" size={18} color={c.textTertiary} />}
        />
      </View>

      {tags.length > 0 ? (
        <FlatList
          horizontal
          data={[{ id: 'all', name: 'All', color: null } as Tag, ...tags]}
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.two, paddingVertical: Spacing.one }}
          renderItem={({ item }) => (
            <Pill
              label={item.name}
              selected={(activeTagId ?? 'all') === item.id}
              onPress={() => {
                setActiveTagId(item.id === 'all' ? null : item.id);
                setActiveSubTagId(null);
              }}
            />
          )}
        />
      ) : null}

      {filteredSubTags.length > 0 ? (
        <FlatList
          horizontal
          data={filteredSubTags}
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.two, paddingVertical: Spacing.one }}
          renderItem={({ item }) => (
            <Pill
              label={item.name}
              size="sm"
              selected={activeSubTagId === item.id}
              onPress={() => setActiveSubTagId(activeSubTagId === item.id ? null : item.id)}
            />
          )}
        />
      ) : null}

      <View style={{ flex: 1, marginTop: Spacing.three }}>
        {loading ? (
          <Text variant="bodySmall" tone="tertiary">
            Loading…
          </Text>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title={exercises.length === 0 ? 'No exercises yet' : 'No matches'}
            subtitle={
              exercises.length === 0
                ? 'Add your first exercise — pull-ups, bench press, anything you train.'
                : 'Try a different search or clear your filters.'
            }
          />
        ) : (
          <>
            <View style={[styles.listHeader, { borderBottomColor: c.border }]}>
              <Text variant="label" tone="tertiary">
                {activeTagId || activeSubTagId || query.trim() ? 'MATCHING EXERCISES' : 'ALL EXERCISES'}
              </Text>
              <Text variant="caption" tone="tertiary">
                {filtered.length} {filtered.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(e) => e.id}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120, gap: Spacing.three }}
            renderItem={({ item }) => (
              <Card onPress={() => router.push(`/exercise/${item.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                  <View style={[styles.glyph, { backgroundColor: c.backgroundInteractive }]}>
                    <Icon name={item.kind === 'bodyweight' ? 'body-outline' : 'barbell-outline'} size={20} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="subheading">{item.name}</Text>
                    {item.tags.length > 0 || item.sub_tags.length > 0 ? (
                      <View style={styles.tagRow}>
                        {item.tags.map((t) => (
                          <Pill key={t.id} label={t.name} size="sm" />
                        ))}
                        {item.sub_tags.map((st) => (
                          <Pill key={st.id} label={st.name} size="sm" />
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Icon name="chevron-forward" size={18} color={c.textTertiary} />
                </View>
              </Card>
            )}
            />
          </>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/exercise/new')}
        style={({ pressed }) => [styles.fab, { backgroundColor: c.accent, opacity: pressed ? 0.9 : 1 }]}>
        <Icon name="add" size={28} color={c.accentForeground} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manage: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
    marginBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  fab: {
    position: 'absolute',
    right: Spacing.five,
    bottom: Spacing.six,
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
