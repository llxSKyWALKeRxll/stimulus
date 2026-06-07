import { differenceInCalendarDays } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ExercisePicker } from '@/components/exercise-picker';
import { SetEditor } from '@/components/set-editor';
import { WorkoutNameField } from '@/components/workout-name-field';
import { Button, Card, EmptyState, Icon, Pill, Screen, Snackbar, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import {
  addExerciseToSession,
  addSet,
  deleteSet,
  deleteWorkoutSession,
  getProfile,
  getSession,
  removeExerciseEntry,
  updateSetDrops,
  type DropInput,
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

const EDIT_WINDOW_DAYS = 7;

/** Workouts are editable for a week after they're performed. */
function withinEditWindow(performedAt: string): boolean {
  return differenceInCalendarDays(new Date(), new Date(performedAt)) <= EDIT_WINDOW_DAYS;
}

type EditTarget =
  | { mode: 'add'; entryId: string; nextIndex: number; kind: ExerciseKind }
  | {
      mode: 'edit';
      entryId: string;
      setId: string;
      kind: ExerciseKind;
      initialDrops: DropInput[];
    };

export default function WorkoutDetail() {
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionWithEntries | null>(null);
  const [units, setUnits] = useState<Units>('kg');
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<EditTarget | null>(null);

  // Undo: deletions are applied optimistically, then committed after a delay
  // unless the user taps Undo. The parent owns the timer; one pending at a time.
  const pendingRef = useRef<{ commit: () => Promise<void>; timer: ReturnType<typeof setTimeout> } | null>(null);
  const snapshotRef = useRef<SessionWithEntries | null>(null);
  const [undoMsg, setUndoMsg] = useState<string | null>(null);

  const editable = session ? withinEditWindow(session.performed_at) : false;

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

  // Commit any still-pending deletion (e.g. on leaving the screen).
  const flushPending = useCallback(async () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    snapshotRef.current = null;
    setUndoMsg(null);
    await p.commit().catch(console.warn);
  }, []);

  // On unmount, make any outstanding deletion permanent.
  useEffect(
    () => () => {
      const p = pendingRef.current;
      if (p) {
        clearTimeout(p.timer);
        void p.commit().catch(console.warn);
      }
    },
    [],
  );

  const scheduleUndoableDelete = useCallback(
    (message: string, optimistic: (s: SessionWithEntries) => SessionWithEntries, commit: () => Promise<void>) => {
      // Any previous pending deletion commits immediately before we start a new one.
      const prev = pendingRef.current;
      if (prev) {
        clearTimeout(prev.timer);
        pendingRef.current = null;
        void prev.commit().catch(console.warn);
      }
      setSession((cur) => {
        if (!cur) return cur;
        snapshotRef.current = cur;
        return optimistic(cur);
      });
      const timer = setTimeout(() => {
        const p = pendingRef.current;
        if (p) {
          pendingRef.current = null;
          snapshotRef.current = null;
          setUndoMsg(null);
          void p.commit().catch(console.warn);
        }
      }, 5000);
      pendingRef.current = { commit, timer };
      setUndoMsg(message);
    },
    [],
  );

  const undoDelete = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    if (snapshotRef.current) setSession(snapshotRef.current);
    snapshotRef.current = null;
    setUndoMsg(null);
  }, []);

  const onPickExercise = async (ex: ExerciseWithTags) => {
    if (!session) return;
    await flushPending();
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

  const onSaveSet = async (drops: DropInput[]) => {
    if (!editing) return;
    await flushPending();
    try {
      if (editing.mode === 'add') {
        await addSet({ exercise_entry_id: editing.entryId, order_index: editing.nextIndex, drops });
      } else {
        await updateSetDrops(editing.setId, drops);
      }
      setEditing(null);
      await reload();
    } catch (e) {
      console.warn(e);
    }
  };

  const editSet = (entry: ExerciseEntryWithSets, set: ExerciseEntryWithSets['sets'][number]) =>
    setEditing({
      mode: 'edit',
      entryId: entry.id,
      setId: set.id,
      kind: entry.exercise.kind,
      initialDrops: set.drops.map((d) => ({
        weight_kg: d.weight_kg,
        reps: d.reps,
        is_bodyweight: d.is_bodyweight,
        is_failure: d.is_failure,
      })),
    });

  const removeEntry = (entryId: string) =>
    scheduleUndoableDelete(
      'Exercise removed',
      (s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entryId) }),
      () => removeExerciseEntry(entryId),
    );

  const removeSet = (entryId: string, setId: string) =>
    scheduleUndoableDelete(
      'Set deleted',
      (s) => ({
        ...s,
        entries: s.entries.map((e) =>
          e.id === entryId ? { ...e, sets: e.sets.filter((x) => x.id !== setId) } : e,
        ),
      }),
      () => deleteSet(setId),
    );

  const deleteWorkout = () =>
    Alert.alert('Delete workout?', 'This permanently removes this workout and all its sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          // Drop any pending set/exercise deletion — the whole session is going.
          const p = pendingRef.current;
          if (p) clearTimeout(p.timer);
          pendingRef.current = null;
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
            editable={editable}
          />
        </View>

        {!editable ? (
          <View style={[styles.lockBanner, { backgroundColor: c.backgroundInteractive, borderColor: c.border }]}>
            <Icon name="lock-closed-outline" size={15} color={c.textTertiary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              Editing is locked — workouts can be changed for {EDIT_WINDOW_DAYS} days after they&apos;re logged.
            </Text>
          </View>
        ) : null}

        {session.entries.length === 0 ? (
          <EmptyState
            icon="add-circle-outline"
            title="Empty workout"
            subtitle={editable ? 'Add your first exercise to start logging sets.' : 'No exercises were logged.'}
          />
        ) : (
          <View style={{ marginTop: Spacing.five, gap: Spacing.four }}>
            {session.entries.map((entry, i) => (
              <EntryBlock
                key={entry.id}
                index={i + 1}
                entry={entry}
                units={units}
                editable={editable}
                onAddSet={() => setEditing({ mode: 'add', entryId: entry.id, nextIndex: entry.sets.length, kind: entry.exercise.kind })}
                onEditSet={(set) => editSet(entry, set)}
                onRemoveSet={(setId) => removeSet(entry.id, setId)}
                onRemoveEntry={() => removeEntry(entry.id)}
              />
            ))}
          </View>
        )}

        {editable ? (
          <View style={{ marginTop: Spacing.five }}>
            <Button title="Add exercise" variant="secondary" icon={<Icon name="add" size={18} color={c.text} />} onPress={() => setPicking(true)} />
          </View>
        ) : null}
      </ScrollView>

      <ExercisePicker visible={picking} onClose={() => setPicking(false)} onPick={onPickExercise} />
      <SetEditor
        visible={editing !== null}
        units={units}
        kind={editing?.kind}
        title={editing?.mode === 'edit' ? 'Edit set' : 'Log set'}
        initialDrops={editing?.mode === 'edit' ? editing.initialDrops : undefined}
        onClose={() => setEditing(null)}
        onSave={onSaveSet}
      />
      <Snackbar visible={undoMsg !== null} message={undoMsg ?? ''} actionLabel="Undo" onAction={undoDelete} />
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
  editable,
  onAddSet,
  onEditSet,
  onRemoveSet,
  onRemoveEntry,
}: {
  index: number;
  entry: ExerciseEntryWithSets;
  units: Units;
  editable: boolean;
  onAddSet: () => void;
  onEditSet: (set: ExerciseEntryWithSets['sets'][number]) => void;
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
        {editable ? (
          <Pressable onPress={onRemoveEntry} hitSlop={8}>
            <Icon name="trash-outline" size={18} color={c.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {entry.sets.length > 0 ? (
        <View style={{ marginTop: Spacing.three, gap: 2 }}>
          {entry.sets.map((s, idx) => (
            <Pressable
              key={s.id}
              onPress={editable ? () => onEditSet(s) : undefined}
              disabled={!editable}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                paddingVertical: Spacing.two,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: c.border,
                opacity: pressed ? 0.6 : 1,
              })}>
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
              {editable ? (
                <>
                  <Icon name="pencil" size={14} color={c.textTertiary} />
                  <Pressable onPress={() => onRemoveSet(s.id)} hitSlop={8}>
                    <Icon name="close" size={16} color={c.textTertiary} />
                  </Pressable>
                </>
              ) : null}
            </Pressable>
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

      {editable ? (
        <View style={{ marginTop: Spacing.three }}>
          <Button title="Add set" variant="ghost" size="sm" fullWidth={false} icon={<Icon name="add" size={16} color={c.accent} />} onPress={onAddSet} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  indexChip: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  setNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
