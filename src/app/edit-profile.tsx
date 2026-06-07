import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ProfileForm, type ProfilePatch } from '@/components/profile-form';
import { Icon, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { updateProfile } from '@/lib/db/queries';
import { useTheme } from '@/lib/theme';

export default function EditProfile() {
  const router = useRouter();
  const { c } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (patch: ProfilePatch) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile(patch);
      await refreshProfile();
      router.back();
    } catch (e) {
      console.warn(e);
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.backgroundInteractive }]}>
          <Icon name="chevron-back" size={20} color={c.text} />
        </Pressable>
        <Text variant="heading">Edit profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Spacing.five, paddingBottom: Spacing.eight }}
        showsVerticalScrollIndicator={false}>
        <ProfileForm
          initial={profile ?? undefined}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
