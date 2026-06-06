import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ExerciseForm } from '@/components/exercise-form';
import { Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

export default function NewExercise() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ marginTop: Spacing.four, marginBottom: Spacing.four }}>
        <Text variant="title">New exercise</Text>
      </View>
      <ExerciseForm
        onSaved={() => router.back()}
        onUseExisting={(ex) => router.replace(`/exercise/${ex.id}`)}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
