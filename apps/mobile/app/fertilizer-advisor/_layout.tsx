import { Stack } from 'expo-router';

export default function FertilizerAdvisorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
