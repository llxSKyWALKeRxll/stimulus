import { useState } from 'react';
import { View } from 'react-native';
import { ProfileForm, type ProfilePatch } from '@/components/profile-form';
import { Logo, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { updateProfile } from '@/lib/db/queries';

export default function Onboarding() {
  const { refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (patch: ProfilePatch) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile(patch);
      await refreshProfile();
      // AuthGate redirects into the app once a display_name is present.
    } catch (e) {
      console.warn(e);
      setSaving(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={{ alignItems: 'center', marginTop: Spacing.seven, marginBottom: Spacing.six }}>
        <Logo size={72} />
        <Text variant="title" align="center" style={{ marginTop: Spacing.five }}>
          Welcome to Stimulus
        </Text>
        <Text variant="body" tone="secondary" align="center" style={{ marginTop: Spacing.two }}>
          Tell us a bit about yourself. You can change any of this later in your profile.
        </Text>
      </View>

      <ProfileForm submitLabel="Get started" submitting={saving} onSubmit={onSubmit} />

      <View style={{ height: Spacing.eight }} />
    </Screen>
  );
}
