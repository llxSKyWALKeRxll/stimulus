import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { TagSelector } from '@/components/tag-selector';
import { Button, Card, Icon, Input, Segmented, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  createExercise,
  createSubTag,
  createTag,
  findExercisesByName,
  listSubTags,
  listTags,
} from '@/lib/db/queries';
import type { Exercise, ExerciseKind, SubTag, Tag } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';

type Props = {
  initialName?: string;
  excludeId?: string;
  submitLabel?: string;
  /** Called after a new exercise is created. */
  onSaved: (ex: Exercise) => void;
  /** Called when the user taps an existing same-named exercise. */
  onUseExisting?: (ex: Exercise) => void;
  onCancel?: () => void;
};

export function ExerciseForm({
  initialName = '',
  excludeId,
  submitLabel = 'Save exercise',
  onSaved,
  onUseExisting,
  onCancel,
}: Props) {
  const { c } = useTheme();
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<ExerciseKind>('weighted');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTags, setSubTags] = useState<SubTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSubTags, setSelectedSubTags] = useState<string[]>([]);
  const [dupes, setDupes] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTags(), listSubTags()])
      .then(([t, st]) => {
        setTags(t);
        setSubTags(st);
      })
      .catch(console.warn);
  }, []);

  // Debounced soft duplicate check.
  useEffect(() => {
    const q = name.trim();
    if (!q) {
      setDupes([]);
      return;
    }
    const handle = setTimeout(() => {
      findExercisesByName(q)
        .then((found) => setDupes(found.filter((e) => e.id !== excludeId)))
        .catch(() => setDupes([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [name, excludeId]);

  const toggle = (id: string, set: string[], setter: (v: string[]) => void) => {
    setter(set.includes(id) ? set.filter((x) => x !== id) : [...set, id]);
  };

  const handleCreateTag = async (tagName: string) => {
    const t = await createTag({ name: tagName });
    setTags((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedTags((prev) => [...prev, t.id]);
  };

  const handleCreateSubTag = async (parentTagId: string, stName: string) => {
    const st = await createSubTag({ parent_tag_id: parentTagId, name: stName });
    setSubTags((prev) => [...prev, st].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedSubTags((prev) => [...prev, st.id]);
  };

  const onSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const ex = await createExercise({
        name: name.trim(),
        notes: notes.trim() || null,
        kind,
        tagIds: selectedTags,
        subTagIds: selectedSubTags.filter((stId) => {
          const st = subTags.find((x) => x.id === stId);
          return st ? selectedTags.includes(st.parent_tag_id) : false;
        }),
      });
      onSaved(ex);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save exercise.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.six }} showsVerticalScrollIndicator={false}>
        <Input
          label="Name"
          placeholder="e.g. Pull-ups, Incline DB press"
          value={name}
          onChangeText={setName}
          autoFocus
          error={error}
        />

        {dupes.length > 0 ? (
          <Card accent style={{ marginBottom: Spacing.three }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Icon name="information-circle-outline" size={16} color={c.accent} />
              <Text variant="label" tone="secondary">
                ALREADY EXISTS
              </Text>
            </View>
            <Text variant="bodySmall" tone="secondary" style={{ marginTop: Spacing.two }}>
              You already have an exercise with this name. Use it instead of creating a duplicate?
            </Text>
            <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
              {dupes.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => onUseExisting?.(d)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: c.backgroundElevated,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    paddingVertical: Spacing.three,
                    paddingHorizontal: Spacing.four,
                  }}>
                  <Text variant="body" weight="semibold">
                    {d.name}
                  </Text>
                  <Icon name="arrow-forward" size={16} color={c.accent} />
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <Text variant="label" tone="tertiary" style={{ marginBottom: Spacing.two }}>
          TYPE
        </Text>
        <Segmented<ExerciseKind>
          value={kind}
          onChange={setKind}
          options={[
            { label: 'Weighted', value: 'weighted' },
            { label: 'Bodyweight', value: 'bodyweight' },
          ]}
        />
        <Text variant="caption" tone="tertiary" style={{ marginTop: Spacing.two, marginBottom: Spacing.four }}>
          {kind === 'bodyweight'
            ? 'Tracks progress by reps. Weight is optional added load (e.g. weighted pull-ups).'
            : 'Tracks progress by weight, est. 1RM and reps.'}
        </Text>

        <Input
          label="Notes (optional)"
          placeholder="Cue, form notes, equipment…"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={{ marginTop: Spacing.two }}>
          <TagSelector
            tags={tags}
            subTags={subTags}
            selectedTagIds={selectedTags}
            selectedSubTagIds={selectedSubTags}
            onToggleTag={(id) => toggle(id, selectedTags, setSelectedTags)}
            onToggleSubTag={(id) => toggle(id, selectedSubTags, setSelectedSubTags)}
            onCreateTag={handleCreateTag}
            onCreateSubTag={handleCreateSubTag}
          />
        </View>
      </ScrollView>

      <View style={{ paddingTop: Spacing.three, gap: Spacing.two }}>
        <Button title={submitLabel} loading={saving} disabled={!name.trim()} onPress={onSave} size="lg" />
        {onCancel ? <Button title="Cancel" variant="ghost" onPress={onCancel} /> : null}
      </View>
    </View>
  );
}
