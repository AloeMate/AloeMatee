import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'AloeVeraMate',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="capture-guide" 
          options={{ title: 'Capture Guide' }} 
        />
        <Stack.Screen 
          name="camera-capture" 
          options={{ title: 'Take Photos' }} 
        />
        <Stack.Screen 
          name="upload" 
          options={{ 
            title: 'Analyzing...',
            headerBackVisible: false 
          }} 
        />
        <Stack.Screen 
          name="results" 
          options={{ title: 'Results' }} 
        />
        <Stack.Screen 
          name="treatment" 
          options={{ title: 'Treatment Plan' }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
