import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, Icon, Screen, SectionLabel, Segmented, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { getProfile, updateProfile } from '@/lib/db/queries';
import type { Profile, Units } from '@/lib/db/types';
import { useTheme } from '@/lib/theme';

export default function ProfileScreen() {
  const { c } = useTheme();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getProfile()
        .then((p) => mounted && setProfile(p))
        .catch(console.warn);
      return () => {
        mounted = false;
      };
    }, []),
  );

  const setUnits = async (units: Units) => {
    if (!profile || profile.units === units) return;
    const optimistic = { ...profile, units };
    setProfile(optimistic);
    try {
      const updated = await updateProfile({ units });
      setProfile(updated);
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

  return (
    <Screen scrollable>
      <View style={{ marginTop: Spacing.five }}>
        <Text variant="title">Profile</Text>
      </View>

      <Card style={{ marginTop: Spacing.five }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.four }}>
          <View style={[styles_avatar, { backgroundColor: c.accentSoft }]}>
            <Icon name="person" size={26} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" tone="tertiary">
              SIGNED IN AS
            </Text>
            <Text variant="body" weight="semibold" style={{ marginTop: 2 }} numberOfLines={1}>
              {account}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ marginTop: Spacing.six }}>
        <SectionLabel>Units</SectionLabel>
        <Segmented<Units>
          value={profile?.units ?? 'kg'}
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

const styles_avatar = {
  width: 52,
  height: 52,
  borderRadius: Radius.full,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
