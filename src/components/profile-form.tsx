import { useState } from 'react';
import { View } from 'react-native';
import { Button, Input, Pill, Segmented, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { Gender, Profile, Units } from '@/lib/db/types';

export type ProfilePatch = {
  display_name: string;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  units: Units;
};

const GENDERS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

type Props = {
  initial?: Partial<Profile>;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (patch: ProfilePatch) => void;
};

export function ProfileForm({ initial, submitLabel, submitting, onSubmit }: Props) {
  const [name, setName] = useState(initial?.display_name ?? '');
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : '');
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [height, setHeight] = useState(initial?.height_cm != null ? String(initial.height_cm) : '');
  const [units, setUnits] = useState<Units>(initial?.units ?? 'kg');

  const ageNum = age.trim() ? parseInt(age, 10) : null;
  const heightNum = height.trim() ? parseFloat(height) : null;

  const ageError = ageNum !== null && (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120);
  const heightError = heightNum !== null && (Number.isNaN(heightNum) || heightNum <= 0 || heightNum >= 300);
  const valid = name.trim().length > 0 && !ageError && !heightError;

  const submit = () => {
    if (!valid) return;
    onSubmit({
      display_name: name.trim(),
      age: ageNum,
      gender,
      height_cm: heightNum,
      units,
    });
  };

  return (
    <View style={{ gap: Spacing.five }}>
      <Input
        label="Name"
        placeholder="What should we call you?"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoFocus
      />

      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Age"
            placeholder="e.g. 27"
            keyboardType="number-pad"
            value={age}
            onChangeText={(t) => setAge(t.replace(/\D/g, '').slice(0, 3))}
            error={ageError ? '13–120' : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Height (cm)"
            placeholder="e.g. 178"
            keyboardType="decimal-pad"
            value={height}
            onChangeText={(t) => setHeight(t.replace(/[^\d.]/g, '').slice(0, 5))}
            error={heightError ? 'Invalid' : undefined}
          />
        </View>
      </View>

      <View>
        <Text variant="label" tone="tertiary" style={{ marginBottom: Spacing.two }}>
          GENDER
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {GENDERS.map((g) => (
            <Pill
              key={g.value}
              label={g.label}
              selected={gender === g.value}
              onPress={() => setGender((prev) => (prev === g.value ? null : g.value))}
            />
          ))}
        </View>
      </View>

      <View>
        <Text variant="label" tone="tertiary" style={{ marginBottom: Spacing.two }}>
          PREFERRED UNITS
        </Text>
        <Segmented<Units>
          value={units}
          onChange={setUnits}
          options={[
            { label: 'Kilograms (kg)', value: 'kg' },
            { label: 'Pounds (lb)', value: 'lb' },
          ]}
        />
      </View>

      <Button title={submitLabel} size="lg" loading={submitting} disabled={!valid} onPress={submit} />
    </View>
  );
}
