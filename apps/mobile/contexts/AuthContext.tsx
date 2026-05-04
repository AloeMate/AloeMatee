/**
 * Authentication Context Provider
 * 
 * Manages auth state across the entire app:
 * - Persists JWT token in AsyncStorage
 * - Provides login/register/logout actions
 * - Auto-validates stored token on app launch
 * - Exposes user info and loading state
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  type User,
  type AuthResponse,
} from '../services/auth';

const TOKEN_KEY = 'aloemate_auth_token';
const USER_KEY = 'aloemate_user';

interface AuthContextType {
  /** Whether the auth state is still being loaded from storage */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** The current user, or null */
  user: User | null;
  /** JWT access token, or null */
  token: string | null;
  /** Login with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Register a new account */
  register: (email: string, password: string, fullName: string, farmName?: string) => Promise<void>;
  /** Logout and clear stored credentials */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // On mount: check for stored token and validate it
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken) {
          // Try to validate the token by calling /me
          try {
            const freshUser = await getCurrentUser(storedToken);
            setToken(storedToken);
            setUser(freshUser);
          } catch {
            // Token expired or invalid — clear storage
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------
  const login = useCallback(async (email: string, password: string) => {
    const response: AuthResponse = await loginUser(email, password);
    
    // Persist token & user
    await AsyncStorage.setItem(TOKEN_KEY, response.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------
  const register = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    farmName?: string,
  ) => {
    const response: AuthResponse = await registerUser(email, password, fullName, farmName);
    
    // Persist token & user
    await AsyncStorage.setItem(TOKEN_KEY, response.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!token && !!user,
        user,
        token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
