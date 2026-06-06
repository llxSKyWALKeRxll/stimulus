import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Input, Pill, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  createSubTag,
  createTag,
  deleteSubTag,
  deleteTag,
  listSubTags,
  listTags,
} from '@/lib/db/queries';
import type { SubTag, Tag } from '@/lib/db/types';

export default function TagsScreen() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTags, setSubTags] = useState<SubTag[]>([]);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const [newTagName, setNewTagName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const load = async () => {
    const [t, st] = await Promise.all([listTags(), listSubTags()]);
    setTags(t);
    setSubTags(st);
  };

  useEffect(() => {
    load().catch(console.warn);
  }, []);

  const addTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag({ name: newTagName.trim() });
      setNewTagName('');
      await load();
    } catch (e) {
      Alert.alert('Could not add tag', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const addSub = async () => {
    if (!activeTagId || !newSubName.trim()) return;
    try {
      await createSubTag({ parent_tag_id: activeTagId, name: newSubName.trim() });
      setNewSubName('');
      await load();
    } catch (e) {
      Alert.alert('Could not add sub-tag', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const removeTag = (tag: Tag) =>
    Alert.alert(
      `Delete "${tag.name}"?`,
      'Sub-tags under this tag are also deleted. Exercises stay but lose this tag.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTag(tag.id);
            if (activeTagId === tag.id) setActiveTagId(null);
            await load();
          },
        },
      ],
    );

  const removeSub = (st: SubTag) =>
    Alert.alert(`Delete "${st.name}"?`, '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSubTag(st.id);
          await load();
        },
      },
    ]);

  const visibleSubs = activeTagId
    ? subTags.filter((st) => st.parent_tag_id === activeTagId)
    : [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <View
          style={{
            marginTop: Spacing.four,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text variant="title">Tags</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text variant="bodySmall" tone="accent" weight="semibold">
              Done
            </Text>
          </Pressable>
        </View>

        <Card style={{ marginTop: Spacing.four }}>
          <Text variant="label" tone="secondary">
            NEW TAG
          </Text>
          <Input
            placeholder="e.g. Back"
            value={newTagName}
            onChangeText={setNewTagName}
            style={{ marginTop: Spacing.two }}
          />
          <View style={{ marginTop: Spacing.three }}>
            <Button title="Add tag" disabled={!newTagName.trim()} onPress={addTag} size="md" />
          </View>
        </Card>

        <View style={{ marginTop: Spacing.five }}>
          <Text variant="label" tone="secondary" style={{ marginBottom: Spacing.three }}>
            YOUR TAGS
          </Text>
          {tags.length === 0 ? (
            <Text variant="bodySmall" tone="tertiary">
              Add a tag to get started.
            </Text>
          ) : (
            <View style={{ gap: Spacing.three }}>
              {tags.map((t) => (
                <Card key={t.id}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <Pill
                      label={t.name}
                      selected={activeTagId === t.id}
                      onPress={() => setActiveTagId(activeTagId === t.id ? null : t.id)}
                    />
                    <Pressable onPress={() => removeTag(t)} hitSlop={8}>
                      <Text variant="bodySmall" tone="danger">
                        Delete
                      </Text>
                    </Pressable>
                  </View>

                  {activeTagId === t.id ? (
                    <View style={{ marginTop: Spacing.three }}>
                      <Text variant="label" tone="tertiary" style={{ marginBottom: Spacing.two }}>
                        SUB-TAGS
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                        {visibleSubs.map((st) => (
                          <Pill
                            key={st.id}
                            label={st.name}
                            size="sm"
                            onPress={() => removeSub(st)}
                          />
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
                        <View style={{ flex: 1 }}>
                          <Input
                            placeholder="e.g. Upper back"
                            value={newSubName}
                            onChangeText={setNewSubName}
                          />
                        </View>
                        <View>
                          <Button
                            title="Add"
                            disabled={!newSubName.trim()}
                            onPress={addSub}
                            fullWidth={false}
                          />
                        </View>
                      </View>
                      <Text variant="caption" tone="tertiary" style={{ marginTop: Spacing.one }}>
                        Tap a sub-tag to remove it.
                      </Text>
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
