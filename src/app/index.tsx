import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';

export default function Index() {
  const { session, loading } = useAuth();
  const { c } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return <Redirect href={session ? '/(tabs)' : '/(auth)/welcome'} />;
}
