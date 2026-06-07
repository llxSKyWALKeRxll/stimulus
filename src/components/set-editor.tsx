import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Icon, Input, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { DropInput } from '@/lib/db/queries';
import type { ExerciseKind, Units } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';
import { displayToKg, formatWeight } from '@/lib/units';

type Props = {
  visible: boolean;
  units: Units;
  kind?: ExerciseKind;
  onClose: () => void;
  onSave: (drops: DropInput[]) => void;
  initialDrops?: DropInput[];
  title?: string;
};

type Row = { weight: string; reps: string; isBodyweight: boolean };

function toRow(d: DropInput, units: Units): Row {
  return {
    weight: d.weight_kg ? formatWeight(d.weight_kg, units) : '',
    reps: String(d.reps),
    isBodyweight: d.is_bodyweight ?? false,
  };
}

function emptyRow(kind: ExerciseKind): Row {
  return { weight: '', reps: '', isBodyweight: kind === 'bodyweight' };
}

export function SetEditor({ visible, units, kind = 'weighted', onClose, onSave, initialDrops, title = 'Log set' }: Props) {
  const { c } = useTheme();
  const bodyweight = kind === 'bodyweight';
  const [rows, setRows] = useState<Row[]>([emptyRow(kind)]);

  // Reset to a clean default each time the sheet opens (for a fresh set).
  useEffect(() => {
    if (visible) {
      setRows(initialDrops && initialDrops.length ? initialDrops.map((d) => toRow(d, units)) : [emptyRow(kind)]);
    }
  }, [visible, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRow = () => setRows((r) => [...r, emptyRow(kind)]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const valid = rows.every((r) => r.reps.trim() !== '' && !Number.isNaN(parseInt(r.reps, 10)));

  const onSubmit = () => {
    if (!valid) return;
    const drops: DropInput[] = rows.map((r) => ({
      weight_kg: displayToKg(parseFloat(r.weight) || 0, units),
      reps: parseInt(r.reps, 10) || 0,
      is_bodyweight: r.isBodyweight,
    }));
    onSave(drops);
    setRows([emptyRow(kind)]);
  };

  const close = () => {
    setRows([emptyRow(kind)]);
    onClose();
  };

  const weightLabel = bodyweight ? `Added ${units} (optional)` : `Weight (${units})`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two }}>
          <Text variant="heading">{title}</Text>
          <Pressable onPress={close} hitSlop={8}>
            <Text variant="bodySmall" tone="secondary" weight="semibold">
              Cancel
            </Text>
          </Pressable>
        </View>

        <Text variant="bodySmall" tone="tertiary" style={{ marginTop: Spacing.one }}>
          {bodyweight
            ? 'Log your reps. Add weight only if you used extra load. Add rows for a drop set.'
            : 'Enter weight and reps. Add rows to log a drop set.'}
        </Text>

        <ScrollView style={{ marginTop: Spacing.four }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
          {rows.map((row, i) => {
            const repsInput = (
              <View style={{ flex: 1 }}>
                <Input
                  label="Reps"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={row.reps}
                  onChangeText={(t) => update(i, { reps: t.replace(/\D/g, '') })}
                />
              </View>
            );
            const weightInput = (
              <View style={{ flex: 1 }}>
                <Input
                  label={weightLabel}
                  placeholder={bodyweight ? 'BW' : '0'}
                  keyboardType="decimal-pad"
                  value={row.weight}
                  onChangeText={(t) => update(i, { weight: t.replace(/[^\d.]/g, '') })}
                />
              </View>
            );
            return (
              <Card key={i} style={{ marginBottom: Spacing.three }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two }}>
                  <Text variant="label" tone="tertiary">
                    {rows.length === 1 ? 'SET' : i === 0 ? 'TOP SET' : `DROP ${i}`}
                  </Text>
                  {rows.length > 1 ? (
                    <Pressable onPress={() => removeRow(i)} hitSlop={8}>
                      <Text variant="bodySmall" tone="danger">
                        Remove
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  {bodyweight ? (
                    <>
                      {repsInput}
                      {weightInput}
                    </>
                  ) : (
                    <>
                      {weightInput}
                      {repsInput}
                    </>
                  )}
                </View>

                {!bodyweight ? (
                  <Pressable
                    onPress={() => update(i, { isBodyweight: !row.isBodyweight })}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.one, gap: Spacing.two }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        borderWidth: 1.5,
                        borderColor: row.isBodyweight ? c.accent : c.borderStrong,
                        backgroundColor: row.isBodyweight ? c.accent : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {row.isBodyweight ? <Icon name="checkmark" size={12} color={c.accentForeground} /> : null}
                    </View>
                    <Text variant="bodySmall" tone="secondary">
                      Bodyweight (weight is added load)
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}

          <Button title="Add drop" variant="secondary" icon={<Icon name="add" size={16} color={c.text} />} onPress={addRow} />
        </ScrollView>

        <View style={{ position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.four, backgroundColor: c.background, paddingTop: Spacing.three }}>
          <Button title="Save set" disabled={!valid} onPress={onSubmit} size="lg" />
        </View>
      </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
