import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Auth gate — redirects users based on authentication state.
 * - If not authenticated → login screen
 * - If authenticated → main app
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for auth state to load

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on login/register → redirect to login
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but on login/register → redirect to home
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutContent() {
  return (
    <AuthGate>
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
        {/* Auth screens — no header */}
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />

        {/* Main app screens */}
        <Stack.Screen
          name="index"
          options={{
            title: 'AloeVeraMate',
            headerShown: true,
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
            headerBackVisible: false,
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
    </AuthGate>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
