import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Logo, Screen, SectionLabel, Segmented, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { listBodyWeights, updateProfile } from '@/lib/db/queries';
import type { Gender, Units } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';
import { formatWeight } from '@/lib/units';

const GENDER_LABEL: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export default function ProfileScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      listBodyWeights()
        .then((bw) => setLatestWeight(bw.length ? bw[bw.length - 1].weight_kg : null))
        .catch(console.warn);
    }, [refreshProfile]),
  );

  const units = profile?.units ?? 'kg';

  const setUnits = async (next: Units) => {
    if (!profile || profile.units === next) return;
    try {
      await updateProfile({ units: next });
      await refreshProfile();
    } catch (e) {
      console.warn(e);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  const account = session?.user?.email ?? session?.user?.phone ?? '—';
  const name = profile?.display_name?.trim() || 'Lifter';

  const details: { label: string; value: string }[] = [
    { label: 'Age', value: profile?.age != null ? `${profile.age}` : '—' },
    { label: 'Gender', value: profile?.gender ? GENDER_LABEL[profile.gender] : '—' },
    { label: 'Height', value: profile?.height_cm != null ? `${profile.height_cm} cm` : '—' },
  ];

  return (
    <Screen scrollable>
      <View style={{ marginTop: Spacing.five, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title">Profile</Text>
        <Pressable
          onPress={() => router.push('/edit-profile')}
          hitSlop={8}
          style={[styles.editBtn, { backgroundColor: c.backgroundInteractive }]}>
          <Icon name="create-outline" size={16} color={c.text} />
          <Text variant="caption" weight="semibold">
            Edit
          </Text>
        </Pressable>
      </View>

      <Card style={{ marginTop: Spacing.five }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.four }}>
          <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
            <Logo size={48} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="bodySmall" tone="tertiary" style={{ marginTop: 2 }} numberOfLines={1}>
              {account}
            </Text>
          </View>
        </View>

        <View style={[styles.detailRow, { borderTopColor: c.border }]}>
          {details.map((d, i) => (
            <View key={d.label} style={[styles.detailCell, i < details.length - 1 && { borderRightWidth: 1, borderRightColor: c.border }]}>
              <Text variant="caption" tone="tertiary">
                {d.label.toUpperCase()}
              </Text>
              <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
                {d.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ marginTop: Spacing.six }}>
        <SectionLabel>Body weight</SectionLabel>
        <Pressable onPress={() => router.push('/body-weight')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
              <Icon name="scale-outline" size={20} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="semibold">
                  {latestWeight != null ? formatWeight(latestWeight, units, { withUnit: true }) : 'Not logged yet'}
                </Text>
                <Text variant="caption" tone="tertiary">
                  Track and chart your body weight
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={c.textTertiary} />
            </View>
          </Card>
        </Pressable>
      </View>

      <View style={{ marginTop: Spacing.six }}>
        <SectionLabel>Units</SectionLabel>
        <Segmented<Units>
          value={units}
          onChange={setUnits}
          options={[
            { label: 'Kilograms (kg)', value: 'kg' },
            { label: 'Pounds (lb)', value: 'lb' },
          ]}
        />
      </View>

      <View style={{ marginTop: Spacing.eight }}>
        <Button
          title="Sign out"
          variant="secondary"
          icon={<Icon name="log-out-outline" size={18} color={c.text} />}
          onPress={confirmSignOut}
        />
      </View>

      <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: Spacing.six }}>
        Stimulus · v1.0.0
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
  },
  detailCell: { flex: 1, alignItems: 'center' },
});
