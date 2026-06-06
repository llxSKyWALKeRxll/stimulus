import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseForm } from '@/components/exercise-form';
import { Card, EmptyState, Icon, Input, Pill, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { listExercises } from '@/lib/db/queries';
import type { Exercise, ExerciseWithTags } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseWithTags) => void;
};

export function ExercisePicker({ visible, onClose, onPick }: Props) {
  const { c } = useTheme();
  const [exercises, setExercises] = useState<ExerciseWithTags[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'list' | 'create'>('list');

  useEffect(() => {
    if (!visible) return;
    setMode('list');
    setQuery('');
    listExercises().then(setExercises).catch(console.warn);
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  const pick = (ex: Exercise | ExerciseWithTags) => {
    const withTags = 'tags' in ex ? (ex as ExerciseWithTags) : { ...(ex as Exercise), tags: [], sub_tags: [] };
    onPick(withTags);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
        <View style={{ marginTop: Spacing.two, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading">{mode === 'create' ? 'New exercise' : 'Add exercise'}</Text>
          <Pressable onPress={mode === 'create' ? () => setMode('list') : onClose} hitSlop={8}>
            <Text variant="bodySmall" tone="secondary" weight="semibold">
              {mode === 'create' ? 'Back' : 'Close'}
            </Text>
          </Pressable>
        </View>

        {mode === 'create' ? (
          <View style={{ flex: 1, marginTop: Spacing.four }}>
            <ExerciseForm
              initialName={query}
              submitLabel="Create & add"
              onSaved={(ex) => pick(ex)}
              onUseExisting={(ex) => pick(ex)}
              onCancel={() => setMode('list')}
            />
          </View>
        ) : (
          <>
            <View style={{ marginTop: Spacing.four }}>
              <Input
                placeholder="Search or type a new name…"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                leading={<Icon name="search" size={18} color={c.textTertiary} />}
              />
            </View>

            <Pressable
              onPress={() => setMode('create')}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  borderRadius: Radius.lg,
                  borderWidth: 1,
                  borderColor: c.borderStrong,
                  borderStyle: 'dashed',
                  padding: Spacing.four,
                  marginBottom: Spacing.three,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="add" size={20} color={c.accent} />
              </View>
              <Text variant="body" weight="semibold">
                {query.trim() ? `Create “${query.trim()}”` : 'Create new exercise'}
              </Text>
            </Pressable>

            <FlatList
              data={filtered}
              keyExtractor={(e) => e.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.two, paddingBottom: 60 }}
              renderItem={({ item }) => (
                <Card onPress={() => pick(item)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading">{item.name}</Text>
                      {item.tags.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two }}>
                          {item.tags.map((t) => (
                            <Pill key={t.id} label={t.name} size="sm" />
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <Icon name="add-circle" size={24} color={c.accent} />
                  </View>
                </Card>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="barbell-outline"
                  title="No matches"
                  subtitle="Tap “Create” above to add this as a new exercise."
                />
              }
            />
          </>
        )}
      </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
