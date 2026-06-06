import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ExercisePicker } from '@/components/exercise-picker';
import { SetEditor } from '@/components/set-editor';
import { WorkoutNameField } from '@/components/workout-name-field';
import { Button, Card, EmptyState, Icon, Pill, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import {
  addExerciseToSession,
  addSet,
  deleteSet,
  deleteWorkoutSession,
  getProfile,
  getSession,
  removeExerciseEntry,
} from '@/lib/db/queries';
import type {
  ExerciseEntryWithSets,
  ExerciseKind,
  ExerciseWithTags,
  SessionWithEntries,
  Units,
} from '@/lib/db/types';
import { formatSessionDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { dropVolumeKg, epley1RM, formatWeight } from '@/lib/units';

export default function WorkoutDetail() {
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionWithEntries | null>(null);
  const [units, setUnits] = useState<Units>('kg');
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<{ entryId: string; nextIndex: number; kind: ExerciseKind } | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const [s, p] = await Promise.all([getSession(id), getProfile()]);
    setSession(s);
    if (p) setUnits(p.units);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reload().catch(console.warn);
  }, [reload]);

  const onPickExercise = async (ex: ExerciseWithTags) => {
    if (!session) return;
    try {
      await addExerciseToSession({
        session_id: session.id,
        exercise_id: ex.id,
        order_index: session.entries.length,
      });
      await reload();
    } catch (e) {
      console.warn(e);
    }
  };

  const onSaveSet = async (drops: { weight_kg: number; reps: number; is_bodyweight?: boolean }[]) => {
    if (!editing) return;
    try {
      await addSet({ exercise_entry_id: editing.entryId, order_index: editing.nextIndex, drops });
      setEditing(null);
      await reload();
    } catch (e) {
      console.warn(e);
    }
  };

  const removeEntry = (entryId: string) =>
    Alert.alert('Remove exercise?', 'All sets logged under it will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeExerciseEntry(entryId);
          await reload();
        },
      },
    ]);

  const removeSetById = async (setId: string) => {
    await deleteSet(setId);
    await reload();
  };

  const deleteWorkout = () =>
    Alert.alert('Delete workout?', 'This permanently removes this workout and all its sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          try {
            await deleteWorkoutSession(id);
            router.back();
          } catch (e) {
            console.warn(e);
          }
        },
      },
    ]);

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

  if (!session) {
    return (
      <Screen>
        <Header onBack={() => router.back()} />
        <Text variant="body" tone="secondary" style={{ marginTop: Spacing.four }}>
          Workout not found.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header onBack={() => router.back()} onDelete={deleteWorkout} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: Spacing.four }}>
          <WorkoutNameField
            sessionId={session.id}
            initialTitle={session.title}
            dateLabel={formatSessionDate(session.performed_at)}
          />
        </View>

        {session.entries.length === 0 ? (
          <EmptyState
            icon="add-circle-outline"
            title="Empty workout"
            subtitle="Add your first exercise to start logging sets."
          />
        ) : (
          <View style={{ marginTop: Spacing.five, gap: Spacing.four }}>
            {session.entries.map((entry, i) => (
              <EntryBlock
                key={entry.id}
                index={i + 1}
                entry={entry}
                units={units}
                onAddSet={() => setEditing({ entryId: entry.id, nextIndex: entry.sets.length, kind: entry.exercise.kind })}
                onRemoveSet={removeSetById}
                onRemoveEntry={() => removeEntry(entry.id)}
              />
            ))}
          </View>
        )}

        <View style={{ marginTop: Spacing.five }}>
          <Button title="Add exercise" variant="secondary" icon={<Icon name="add" size={18} color={c.text} />} onPress={() => setPicking(true)} />
        </View>
      </ScrollView>

      <ExercisePicker visible={picking} onClose={() => setPicking(false)} onPick={onPickExercise} />
      <SetEditor visible={editing !== null} units={units} kind={editing?.kind} onClose={() => setEditing(null)} onSave={onSaveSet} />
    </Screen>
  );
}

function Header({ onBack, onDelete }: { onBack: () => void; onDelete?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={onBack} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.backgroundInteractive }]}>
        <Icon name="chevron-back" size={20} color={c.text} />
      </Pressable>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.backgroundInteractive }]}>
          <Icon name="trash-outline" size={18} color={c.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

function EntryBlock({
  index,
  entry,
  units,
  onAddSet,
  onRemoveSet,
  onRemoveEntry,
}: {
  index: number;
  entry: ExerciseEntryWithSets;
  units: Units;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemoveEntry: () => void;
}) {
  const { c } = useTheme();
  const isBodyweight = entry.exercise.kind === 'bodyweight';
  const totalVolume = entry.sets.reduce(
    (acc, s) => acc + s.drops.reduce((a, d) => a + dropVolumeKg(d.weight_kg, d.reps), 0),
    0,
  );
  let bestEst1RM = 0;
  let totalReps = 0;
  let maxReps = 0;
  entry.sets.forEach((s) =>
    s.drops.forEach((d) => {
      const e = epley1RM(d.weight_kg, d.reps);
      if (e > bestEst1RM) bestEst1RM = e;
      totalReps += d.reps;
      if (d.reps > maxReps) maxReps = d.reps;
    }),
  );

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={[styles.indexChip, { backgroundColor: c.accentSoft }]}>
          <Text style={{ color: c.accent, fontWeight: '700', fontSize: 13 }}>{index}</Text>
        </View>
        <Text variant="subheading" style={{ flex: 1 }} numberOfLines={1}>
          {entry.exercise.name}
        </Text>
        <Pressable onPress={onRemoveEntry} hitSlop={8}>
          <Icon name="trash-outline" size={18} color={c.textTertiary} />
        </Pressable>
      </View>

      {entry.sets.length > 0 ? (
        <View style={{ marginTop: Spacing.three, gap: 2 }}>
          {entry.sets.map((s, idx) => (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                paddingVertical: Spacing.two,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: c.border,
              }}>
              <View style={[styles.setNum, { backgroundColor: c.backgroundInteractive }]}>
                <Text variant="caption" weight="bold">
                  {idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="semibold">
                  {s.drops
                    .map((d) => {
                      const w = d.weight_kg === 0 && d.is_bodyweight ? 'BW' : `${formatWeight(d.weight_kg, units)}${units}`;
                      return `${w} × ${d.reps}`;
                    })
                    .join('  →  ')}
                </Text>
                {s.drops.length > 1 ? (
                  <Text variant="caption" tone="accent" style={{ marginTop: 2 }}>
                    drop set · {s.drops.length} rounds
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => onRemoveSet(s.id)} hitSlop={8}>
                <Icon name="close" size={16} color={c.textTertiary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.three }}>
          No sets yet.
        </Text>
      )}

      {entry.sets.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three, flexWrap: 'wrap' }}>
          {isBodyweight ? (
            <>
              <Pill label={`Top set ${maxReps} reps`} size="sm" />
              <Pill label={`${totalReps} total reps`} size="sm" />
              {totalVolume > 0 ? <Pill label={`+${formatWeight(totalVolume, units)} ${units}`} size="sm" /> : null}
            </>
          ) : (
            <>
              <Pill label={`Volume ${formatWeight(totalVolume, units)} ${units}`} size="sm" />
              {bestEst1RM > 0 ? <Pill label={`Est. 1RM ${formatWeight(bestEst1RM, units)} ${units}`} size="sm" /> : null}
              <Pill label={`${totalReps} reps`} size="sm" />
            </>
          )}
        </View>
      ) : null}

      <View style={{ marginTop: Spacing.three }}>
        <Button title="Add set" variant="ghost" size="sm" fullWidth={false} icon={<Icon name="add" size={16} color={c.accent} />} onPress={onAddSet} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  indexChip: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  setNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
