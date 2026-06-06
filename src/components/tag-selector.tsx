import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Icon, Pill, Text } from '@/components/ui';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import type { SubTag, Tag } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';

type Props = {
  tags: Tag[];
  subTags: SubTag[];
  selectedTagIds: string[];
  selectedSubTagIds: string[];
  onToggleTag: (id: string) => void;
  onToggleSubTag: (id: string) => void;
  /** When provided, an inline "+ New" affordance appears for tags. */
  onCreateTag?: (name: string) => Promise<void> | void;
  /** When provided, an inline "+ New" affordance appears under sub-tags. */
  onCreateSubTag?: (parentTagId: string, name: string) => Promise<void> | void;
};

export function TagSelector({
  tags,
  subTags,
  selectedTagIds,
  selectedSubTagIds,
  onToggleTag,
  onToggleSubTag,
  onCreateTag,
  onCreateSubTag,
}: Props) {
  const visibleSubTags = useMemo(
    () => subTags.filter((st) => selectedTagIds.includes(st.parent_tag_id)),
    [subTags, selectedTagIds],
  );
  // Sub-tags are created under the most recently selected tag.
  const subParentId = selectedTagIds[selectedTagIds.length - 1] ?? null;

  return (
    <View>
      <Text variant="label" tone="tertiary" style={{ marginBottom: Spacing.two }}>
        TAGS
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' }}>
        {tags.map((t) => (
          <Pill
            key={t.id}
            label={t.name}
            selected={selectedTagIds.includes(t.id)}
            onPress={() => onToggleTag(t.id)}
          />
        ))}
        {onCreateTag ? <AddChip placeholder="New tag" onSubmit={(name) => onCreateTag(name)} /> : null}
      </View>
      {tags.length === 0 && !onCreateTag ? (
        <Text variant="bodySmall" tone="tertiary">
          No tags yet. Create some from Exercises → Tags.
        </Text>
      ) : null}

      {visibleSubTags.length > 0 || (onCreateSubTag && subParentId) ? (
        <>
          <Text variant="label" tone="tertiary" style={{ marginTop: Spacing.four, marginBottom: Spacing.two }}>
            SUB-TAGS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' }}>
            {visibleSubTags.map((st) => (
              <Pill
                key={st.id}
                label={st.name}
                size="sm"
                selected={selectedSubTagIds.includes(st.id)}
                onPress={() => onToggleSubTag(st.id)}
              />
            ))}
            {onCreateSubTag && subParentId ? (
              <AddChip
                placeholder="New sub-tag"
                small
                onSubmit={(name) => onCreateSubTag(subParentId, name)}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

function AddChip({
  placeholder,
  small,
  onSubmit,
}: {
  placeholder: string;
  small?: boolean;
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const name = value.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await onSubmit(name);
      setValue('');
      setOpen(false);
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          borderRadius: Radius.full,
          borderWidth: 1,
          borderColor: c.borderStrong,
          borderStyle: 'dashed',
          paddingVertical: small ? Spacing.one : Spacing.two - 1,
          paddingHorizontal: small ? Spacing.three : Spacing.four,
        }}>
        <Icon name="add" size={14} color={c.textSecondary} />
        <Text style={{ color: c.textSecondary, fontSize: small ? FontSize.xs : FontSize.sm, fontWeight: FontWeight.semibold }}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: c.accent,
        backgroundColor: c.backgroundElevated,
        paddingLeft: Spacing.three,
        paddingRight: 4,
        height: small ? 30 : 36,
      }}>
      <TextInput
        autoFocus
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        style={{ color: c.text, fontSize: small ? FontSize.xs : FontSize.sm, minWidth: 80, padding: 0 }}
        returnKeyType="done"
      />
      <Pressable onPress={submit} hitSlop={6} style={{ marginLeft: 6, padding: 4 }}>
        <Icon name="checkmark" size={16} color={c.accent} />
      </Pressable>
    </View>
  );
}
