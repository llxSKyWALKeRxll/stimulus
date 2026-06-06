import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { TagSelector } from '@/components/tag-selector';
import { Button, Input, Screen, Segmented, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  archiveExercise,
  createSubTag,
  createTag,
  getExercise,
  listSubTags,
  listTags,
  updateExercise,
} from '@/lib/db/queries';
import type { ExerciseKind, SubTag, Tag } from '@/lib/db/types';

export default function EditExercise() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<ExerciseKind>('weighted');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTags, setSubTags] = useState<SubTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSubTags, setSelectedSubTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getExercise(id), listTags(), listSubTags()])
      .then(([ex, t, st]) => {
        setTags(t);
        setSubTags(st);
        if (ex) {
          setName(ex.name);
          setKind(ex.kind);
          setNotes(ex.notes ?? '');
          setSelectedTags(ex.tags.map((x) => x.id));
          setSelectedSubTags(ex.sub_tags.map((x) => x.id));
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [id]);

  const toggle = (id: string, set: string[], setter: (v: string[]) => void) => {
    if (set.includes(id)) setter(set.filter((x) => x !== id));
    else setter([...set, id]);
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
    if (!id || !name.trim() || saving) return;
    setSaving(true);
    try {
      await updateExercise(id, {
        name: name.trim(),
        notes: notes.trim() || null,
        kind,
        tagIds: selectedTags,
        subTagIds: selectedSubTags.filter((stId) => {
          const st = subTags.find((x) => x.id === stId);
          return st ? selectedTags.includes(st.parent_tag_id) : false;
        }),
      });
      router.back();
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const onArchive = () => {
    if (!id) return;
    Alert.alert(
      'Archive exercise?',
      'Past sessions stay logged. The exercise will no longer appear in your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await archiveExercise(id);
            router.dismissAll();
            router.replace('/(tabs)/exercises');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Screen>
        <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.four }}>
          Loading…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ marginTop: Spacing.four }}>
          <Text variant="title">Edit exercise</Text>
        </View>

        <View style={{ marginTop: Spacing.five }}>
          <Input label="Name" value={name} onChangeText={setName} />

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

          <View style={{ height: Spacing.four }} />

          <Input
            label="Notes"
            placeholder="Cue, form notes, equipment…"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <View style={{ marginTop: Spacing.three }}>
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

        <View style={{ marginTop: Spacing.six }}>
          <Button title="Archive" variant="danger" onPress={onArchive} />
        </View>
      </ScrollView>

      <View style={{ paddingVertical: Spacing.three, gap: Spacing.two }}>
        <Button title="Save changes" loading={saving} disabled={!name.trim()} onPress={onSave} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
