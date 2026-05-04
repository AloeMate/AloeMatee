import { Stack } from 'expo-router';

export default function HarvestYieldLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: 'Harvest Yield Predictor',
        headerStyle: { backgroundColor: '#1B5E20' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    />
  );
}
